---
title: "Entry 004 - Auditoria y endurecimiento del contexto Payment"
date: 2026-04-10
summary: "Correccion de inconsistencias, estados terminales CANCELLED y FAILED, politica de reintentos, guardas de estado en Payment y PaymentOrder, limpieza de codigo muerto."
tags: ["ddd", "payment", "audit", "state-machine", "testing"]
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
