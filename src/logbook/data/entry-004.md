---
title: "Entry 004 - Auditoria Payment, Live Demo POS y capa de servicios"
date: 2026-04-10
summary: "Auditoria y endurecimiento del contexto Payment, Live Demo interactivo con Preact Islands y Nanostores, capa de servicios para separar UI del dominio."
tags: ["ddd", "payment", "audit", "state-machine", "testing", "frontend", "preact", "live-demo"]
testSuites: ["iter4-payment-audit"]
closed: false
---

## Auditoria del contexto Payment

Se realizo una auditoria profunda del contexto Payment que revelo 11 problemas de diferente severidad. Esta iteracion los resuelve todos.

## Estados terminales CANCELLED y FAILED

`PaymentOrderStatus` tenia `CANCELLED` y `FAILED` declarados pero nunca se usaban. Ahora tienen comportamiento real:

- **CANCELLED**: gatillado por el usuario via `CancelPaymentOrder`. Solo desde `PENDING` o `PARTIAL`
- **FAILED**: gatillado automaticamente por el sistema cuando se acumulan 3 pagos fallidos. Solo desde `PENDING` o `PARTIAL`

Ambos son estados terminales — una vez en `CANCELLED` o `FAILED`, no se aceptan mas pagos ni se puede transicionar a otro estado. El helper privado `isTerminal()` unifica esta validacion en `addPayment()`, `registerPayment()`, `cancel()` y `markAsFailed()`.

## Politica de reintentos en PaymentCommit

`PaymentCommit` ahora implementa la politica de reintentos como logica de aplicacion (no de dominio):

- Despues de registrar un pago fallido, verifica `getFailedPaymentCount()`
- Si `failedCount >= 3`, llama `markAsFailed()` en la order y publica `PaymentOrderFailed`
- Sales reacciona via `SaleFailedOnPayment` → `FailSale` (ya implementado en iter3)

La constante `MAX_FAILED_PAYMENTS = 3` vive en el use case, no en el agregado.

## CancelPaymentOrder use case

Nuevo use case para cancelacion por el usuario:

- Busca la order por `saleId`
- Llama `PaymentOrder.cancel()`
- Actualiza el repositorio
- No publica eventos (la cancelacion es una decision del usuario, no un resultado del procesador)

## Guardas de estado en Payment (entidad)

`Payment.complete()` y `Payment.fail()` ahora retornan `Result` y validan que el estado actual sea `PENDING`. Antes se podian llamar multiples veces o en orden incorrecto sin error.

`PaymentOrder.registerPayment()` propaga el `Result` de estas transiciones.

## PaymentOrder.create() retorna Result

`PaymentOrder.create()` ahora valida `totalAmount > 0` y retorna `Result<InvalidPaymentError, PaymentOrder>`. `CreatePaymentOrder` use case propaga este resultado.

## Guarda de duplicados en CreatePaymentOrder

`CreatePaymentOrder` verifica que no exista una `PaymentOrder` para el mismo `saleId` antes de crear una nueva. Previene duplicados por eventos repetidos.

## Validacion de monto en addPayment

`addPayment()` rechaza pagos con `amount <= 0` retornando `InvalidPaymentError`.

## Renombramiento del event handler

`PaymentCompletedEventHandler` renombrado a `CreatePaymentOrderOnSaleReady` — el nombre anterior era confuso porque sugeria que manejaba un evento de Payment completado, cuando en realidad reacciona a `SalesReadyToPay`.

## Limpieza

- `Payment` constructor ahora `private` — fuerza el uso de `create()`
- `externalReference` eliminado de `Payment` — campo muerto nunca asignado
- `delete()` eliminado de `PaymentOrderRepository` e implementacion — sin caso de uso
- Codigo comentado eliminado de `recalculateStatus()`

## Live Demo POS

Se implemento una seccion interactiva en `/pos` que permite ejecutar el flujo completo de una venta usando los bounded contexts reales del dominio.

### Stack del frontend

- **Preact** (~3 KB) como framework de islands via `@astrojs/preact`
- **Nanostores** (~300 bytes) para estado compartido entre islands
- JSX configurado con `jsxImportSource: "preact"` en tsconfig

### Arquitectura: servicios en vez de bridge

Se descarto un bridge monolitico en favor de una capa de servicios distribuida por contexto:

- **CatalogService**: inicializa productos demo, refresca stock
- **SaleService**: crear venta, agregar/remover productos, confirmar, cancelar, nueva transaccion
- **PaymentService**: registrar pago, commit externo, procesar pago (con simulacion de delay), refrescar estado de la order

Cada servicio encapsula dos responsabilidades: llamar los use cases del dominio y actualizar los stores de UI. Los componentes solo conocen servicios — no importan ni stores ni use cases directamente.

### Stores (Nanostores)

- **catalog**: lista de productos con stock
- **cart**: items del carrito, estado de la venta (`idle`, `active`, `confirmed`, `cancelled`), saleId
- **payment**: estado del flujo de pago, lista de pagos, cambio, total a pagar
- **toast**: stack de notificaciones con auto-dismiss

### Componentes Preact

- **ProductGrid** + **ProductCard**: catalogo de productos, click para agregar
- **Cart**: lista de items, total, acciones de confirmar/cancelar
- **PaymentPanel**: seleccion de metodo, monto, historial de pagos, pantalla de completado
- **ToastContainer**: notificaciones apiladas en esquina inferior derecha con animacion slide-in

### Notificaciones (Toast)

Integradas en los servicios para feedback inmediato: exito al confirmar venta, error al agregar producto sin stock, pago completado con cambio, fallo definitivo del pago, etc. Tres tipos: `success` (verde), `error` (rojo), `info` (gris).

### Pagina

La pagina `pos.astro` es un shell estatico con layout de 3 columnas. Los 3 paneles y el toast container son Preact islands con `client:load`. El catalogo se inicializa via `<script>` que llama `CatalogService.init()`.

Acceso desde el home via boton "Live Demo" en el hero.
