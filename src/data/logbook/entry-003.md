---
title: "Entry 003 - Flujo asincronico de pagos, procesamiento externo y resolucion definitiva"
date: 2026-04-08
summary: "Modelado del procesamiento de pagos como operacion externa: Payment en PENDING hasta confirmacion, PaymentCommit para resolver resultados, manejo de fallos definitivos con PaymentOrderFailed y restauracion de stock."
tags: ["ddd", "payment", "sales", "events", "state-machine", "async", "testing"]
testSuites: ["iter3-payment-lifecycle"]
closed: true
closedDate: 2026-04-10
---

## Reconocer el procesamiento externo del pago

El iter2 asumia que agregar un pago era una operacion inmediata y determinista: `addPayment()` marcaba la order como `COMPLETED` apenas los pagos cubrian el total. Pero el procesamiento de un pago (tarjeta, transferencia, etc.) es **externo al sistema** — el resultado llega despues, desde un procesador que no controlamos.

Este iter rediseña el flujo para reflejar esa realidad. El sistema **nunca declara** el exito o fallo de un pago; solo **reacciona** al resultado que le comunica el procesador externo.

## Payment como entidad asincronica

`Payment` ahora arranca en `PENDING` cuando se registra. Se confirma via `complete()` o `fail()` solo cuando llega el resultado externo:

- **`PENDING`**: registrado, enviado al procesador, esperando resultado
- **`COMPLETED`**: el procesador confirmo el cobro
- **`FAILED`**: el procesador rechazo el pago

El ID del pago se recibe como parametro en la creacion (en vez de generarse internamente), permitiendo correlacionar con el procesador externo.

## Nueva semantica de PaymentOrderStatus

Con pagos asincronicos, el estado de la order depende de dos cosas: **cobertura** (suma de pagos no-fallidos) y **confirmacion** (pagos en `COMPLETED`):

- **`PENDING`**: la suma de pagos no-fallidos no cubre el total
- **`PARTIAL`**: la suma cubre el total, pero algun pago sigue `PENDING` esperando confirmacion externa
- **`COMPLETED`**: la suma cubre el total y todos los pagos no-fallidos estan `COMPLETED`

`CANCELLED` fue eliminado del enum — el ciclo se simplifica y la cancelacion es ahora una consecuencia del fallo definitivo de los pagos, manejada a nivel de `Sale`.

## recalculateStatus como fuente unica de verdad

Toda transicion de estado pasa por un unico metodo privado `recalculateStatus()` que implementa las reglas de arriba. Se invoca despues de cualquier operacion que modifique los pagos (`addPayment`, `registerPayment`), garantizando consistencia.

## PaymentCommit: el punto de entrada del resultado externo

Se introdujo el use case `PaymentCommit` que recibe `(paymentId, success: boolean)`. Su responsabilidad:

1. Localiza la `PaymentOrder` que contiene ese pago (via `findByPaymentId`)
2. Delega a `PaymentOrder.registerPayment(paymentId, success)`
3. El agregado recalcula su estado
4. Si la order transiciona a `COMPLETED`, publica `PaymentOrderCompleted`

Este es el unico punto donde se materializa el resultado externo en el dominio.

## Pago fallido hace retroceder la order

Cuando un pago falla (`registerPayment(id, false)`), el pago se marca como `FAILED` y deja de contar para la cobertura. Si la suma de no-fallidos cae por debajo del total, la order **vuelve a `PENDING`** — el usuario puede agregar otro pago para cubrir la diferencia.

Esto evita que la order quede en un estado inconsistente donde "estaba cubierta" pero ahora no. La cobertura siempre refleja la realidad de los pagos no-fallidos.

## Fallo definitivo: PaymentOrderFailed y FailSale

Cuando los reintentos se agotan (politica pendiente de implementar), el use case emite el evento `PaymentOrderFailed(saleId)`. Sales reacciona via `SaleFailedOnPayment` handler, que invoca `FailSale`:

- Transiciona la `Sale` de `READY_TO_PAY` a `CANCELLED`
- Restaura el stock committed llamando a `HandleStockPort.restoreStock()` para cada item

`Product.restoreStock(quantity)` es una nueva operacion que incrementa `stock` sin tocar `reservedStock`, porque el stock ya fue confirmado (committed) al registrar la venta.

## Comunicacion bidireccional entre contextos

- **Sales** → `SalesReadyToPay` → **Payment**
- **Payment** → `PaymentOrderCompleted` → **Sales**
- **Payment** → `PaymentOrderFailed` → **Sales**

Los tres eventos son DTOs simples. Ningun contexto importa clases del otro. Toda la comunicacion pasa por el `InMemoryEventBus`.

## Flujo completo de una venta

1. Sale **DRAFT** — agregando items, stock reservado
2. `confirmSale()` → **READY_TO_PAY** — stock committed
3. `SalesReadyToPay` → Payment crea PaymentOrder en **PENDING**
4. `addPayment(s)` → pagos PENDING, order **PENDING** o **PARTIAL**
5. `paymentCommit(id, true/false)` → pagos COMPLETED/FAILED
6. Cuando todos COMPLETED y cubierto → `PaymentOrderCompleted` → Sale **COMPLETED**
7. Si los pagos fallan definitivamente → `PaymentOrderFailed` → Sale **CANCELLED** + stock restaurado

## Maquinas de estado resultantes

**Sale**: `DRAFT → READY_TO_PAY → COMPLETED`, `DRAFT → CANCELLED`, `READY_TO_PAY → CANCELLED` (via PaymentOrderFailed)

**PaymentOrder**: `PENDING ↔ PARTIAL → COMPLETED` — la transicion `PARTIAL → PENDING` ocurre cuando un pago falla y reduce la cobertura.

**Payment**: `PENDING → COMPLETED`, `PENDING → FAILED` — terminal en ambos casos.

## Tests de la iteracion

El suite `iter3-payment-lifecycle` cubre:

- Transiciones sequenciales: `PENDING → PENDING → PENDING → PARTIAL → COMPLETED`
- Pago unico que cubre el total transiciona a `PARTIAL` (no directamente a `COMPLETED`)
- Cash overpayment calcula change correctamente en `PARTIAL`
- Pago fallido hace retroceder a `PENDING`
- Cross-context: Sale transiciona a `COMPLETED` solo despues de confirmar todos los pagos
- Sale permanece en `READY_TO_PAY` mientras la order este en `PARTIAL`
