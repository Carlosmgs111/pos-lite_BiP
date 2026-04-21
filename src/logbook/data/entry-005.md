---
title: "Entry 005 - Payment Gateway, SSE reactivo, separación de agregados"
date: 2026-04-14
closedDate: 2026-04-20
summary: "Integración con payment gateway externo, sistema de eventos SSE, migración a endpoints server-side, separación de Payment y PaymentOrder como agregados independientes con estado incremental."
tags: ["ddd", "payment", "gateway", "sse", "hexagonal", "event-driven", "api", "aggregates"]
testSuites: ["iter4-payment-audit"]
closed: false
---

## Payment Gateway Mock

Se implementó un procesador de pago externo (`externals/payment-gateway/`) usando `node:http` puro. Simula latencia asíncrona (5–20s) y tasa de fallo configurable (20%). Al resolver, envía webhook callback al backend.

**Endpoints del gateway:**
- `POST /process-payment` — recibe pago, retorna `transaction_id` en PROCESSING
- `GET /transaction?id=` — consulta estado puntual

**Contrato del dominio (`PaymentGateway` port):**
- `requestPayment(request)` — fire-and-forget, retorna transaction ID
- `queryStatus(transactionId)` — single-check stateless (retry/backoff en el adapter)

## Arquitectura SSE

Se diseñó un sistema de push server-to-client basado en Server-Sent Events:

**Infraestructura (`SSEStreamAdapter`):**
- Encapsula lifecycle del stream (controller, encoder, keep-alive, close state)
- `sendEvent(type, data)` usa campos nativos SSE (`event:` + `data:`)
- Race-condition safe: flag `closed`, try/catch en `enqueue`, cleanup idempotente
- Soporte de `cancel()` del ReadableStream

**EventBus tipado:**
- `DomainEvent<K>` con `EventMap` — payload inferido del nombre de evento en compile-time
- `subscribeWithFilter` — utilidad para multi-event subscription con predicados
- Event translator en endpoints: nombres internos → contrato público

**Endpoint `/api/payment/events`:**
- SSE por contexto de servicio (payment events gateway)
- Eventos: `payment.completed`, `payment.failed`, `payment.transaction.result`
- `EventListener` en el cliente con `addEventListener` nativo por tipo

## Migración a Server-Side Execution

Todo el dominio se ejecuta exclusivamente en el servidor. Los servicios del cliente (`CatalogService`, `SaleService`, `PaymentService`) usan `fetch` — cero imports de `package/core`.

**Endpoints creados:**
- Catalog: `POST /api/catalog/init`, `GET /api/catalog/stock`
- Sales: `POST /api/sales/create`, `POST|DELETE /api/sales/items`, `POST /api/sales/register`, `POST /api/sales/cancel`
- Payment: `POST /api/payment/register`, `/process`, `/commit`, `/webhook`, `/reconcile`, `GET /status`, `GET /events`

## Separación de agregados: Payment ↔ PaymentOrder

Se separaron Payment y PaymentOrder como agregados independientes con sus propios repositorios.

**PaymentOrder (agregado fuerte — decide):**
- Valida si un pago puede ser aceptado (`assertCanAcceptPayment`)
- Estado acumulado interno: `paidAmount`, `pendingAmount`, `failedAttempts`
- Operaciones incrementales O(1): `registerPendingPayment`, `applyPayment`, `registerFailedAttempt`
- No depende de `Payment[]` para ningún cálculo — autosuficiente

**Payment (agregado autónomo — actúa):**
- Referencia `paymentOrderId` (no al revés)
- Lifecycle propio: `complete()`, `fail()`, `processing(externalId)`
- Su propio `PaymentRepository`

**Principio de diseño:**
- **Dominancia en creación**: PaymentOrder condiciona si se puede crear un Payment
- **Autonomía en confirmación**: Payment transiciona sin consultar al PaymentOrder
- **Sincronización incremental**: ConfirmPayment aplica `applyPayment(amount)` o `registerFailedAttempt(amount)` — no recalcula desde la lista completa

## Screaming Architecture en Frontend

Se reorganizó `src/` siguiendo screaming architecture:
- `src/pos/` — POS module (components, services, stores)
- `src/logbook/` — Logbook module (components, ddd, data, types, lib)
- `src/shared/` — Cross-module (layouts, i18n, styles, components)

## Decisiones arquitectónicas clave

1. **SSE como trigger, HTTP como source of truth**: el evento dice "algo cambió", el `fetch` a `/api/payment/status` dice "qué cambió"
2. **Un EventListener por servicio**: cada contexto (payment, sales) tiene su propio listener, no comparten canal
3. **El gateway no bloquea**: `ProcessPayment` es fire-and-forget. La resolución llega vía webhook o reconciliación
4. **Errores de infra vs dominio**: gateway unreachable → excepción (infra). Payment rechazado → Result.fail (dominio)
5. **PaymentOrder es autosuficiente**: nunca necesita cargar Payment[] para decidir. Estado acumulado, no computado.
