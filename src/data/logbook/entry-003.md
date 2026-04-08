---
title: "Entry 003 - Lifecycle de pagos, eventos bidireccionales y maquinas de estado"
date: 2026-04-08
summary: "Estado PARTIAL en PaymentOrder, evento PaymentOrderCompleted para cerrar el ciclo Sale, comunicacion bidireccional Sales ↔ Payment via eventos."
tags: ["ddd", "payment", "sales", "events", "state-machine", "testing"]
testSuites: ["iter3-payment-lifecycle"]
closed: false
---

## Estado PARTIAL en PaymentOrder

Se agrego el estado `PARTIAL` a `PaymentOrderStatus` para distinguir entre una order sin pagos (`PENDING`) y una con pagos parciales que no cubren el total. La transicion es:

- `PENDING` → `PARTIAL`: al recibir el primer pago que no cubre el total
- `PARTIAL` → `PARTIAL`: pagos subsiguientes que aun no cubren
- `PENDING` o `PARTIAL` → `COMPLETED`: cuando los pagos acumulados cubren o exceden el total

## Evento PaymentOrderCompleted

Cuando `AddPayment` detecta que la `PaymentOrder` transiciono a `COMPLETED`, publica un evento `PaymentOrderCompleted(saleId)`. Este evento es consumido por el contexto Sales a traves de `SaleCompletedOnPayment`, que invoca `CompleteSale` para transicionar la venta de `READY_TO_PAY` a `COMPLETED`.

## Comunicacion bidireccional via eventos

Los contextos Sales y Payment ahora se comunican bidireccionalmente sin acoplamiento directo:

- **Sales → Payment**: `SalesReadyToPay` — al confirmar una venta, se crea automaticamente una `PaymentOrder`
- **Payment → Sales**: `PaymentOrderCompleted` — al completar el pago, la venta transiciona a `COMPLETED`

Ningun contexto importa directamente clases del otro. Solo conocen los eventos (DTOs simples) y reaccionan a traves del `InMemoryEventBus`.

## Maquina de estados completa de Sale

- **DRAFT** → **READY_TO_PAY** → **COMPLETED**
- **DRAFT** → **CANCELLED**

Donde:

- **DRAFT**: venta en construccion, se pueden agregar/remover items
- **READY_TO_PAY**: venta confirmada, stock committed, esperando pago
- **COMPLETED**: pago completado, ciclo cerrado
- **CANCELLED**: venta cancelada desde DRAFT, stock liberado

## Nuevo use case CompleteSale

`CompleteSale` transiciona una venta de `READY_TO_PAY` a `COMPLETED`. Solo es invocado reactivamente por el event handler `SaleCompletedOnPayment`, no directamente por el usuario. Esto garantiza que una venta solo se completa cuando el pago esta cubierto.

## Nuevos artifacts visuales

Se agregaron dos nuevos tipos de artifacts al logbook:

- **Domain Events**: visualiza publisher → evento → subscriber
- **State Machines**: visualiza estados y transiciones por entidad
