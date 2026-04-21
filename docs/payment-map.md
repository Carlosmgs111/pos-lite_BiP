# Payment

## Index

- [Capabilities](#capabilities)
  - [CreatePaymentOrder](#createpaymentorder)
  - [CancelPaymentOrder](#cancelpaymentorder)
  - [AddPayment](#addpayment)
  - [ConfirmPayment](#confirmpayment)
  - [ProcessPayment](#processpayment)
  - [ReconcilePayment](#reconcilepayment)
- [Aggregates](#aggregates)
  - [PaymentOrder](#paymentorder)
  - [Payment](#payment)
- [Domain Events](#domain-events)
  - [PaymentOrderCompleted](#paymentordercompleted)
  - [PaymentOrderFailed](#paymentorderfailed)
  - [PaymentTransactionResult](#paymenttransactionresult)
- [Domain Ports](#domain-ports)
  - [PaymentGateway](#paymentgateway)
- [Value Objects / Enums](#value-objects--enums)
  - [PaymentMethod](#paymentmethod)
  - [PaymentOrderStatus](#paymentorderstatus)
  - [PaymentStatus](#paymentstatus)
  - [Price](./shared-map.md#price)

## Upstream / Downstream

- Sales → upstream (emits SalesReadyToPay)
- Payment → downstream (consumes SalesReadyToPay)

## Application Layer

### Capabilities

- #### CreatePaymentOrder
  Use: [PaymentOrderRepository](#paymentorderrepository)
  Aggregates: [PaymentOrder](#paymentorder)
  Intent: Creates a new payment order for a sale
  Consistency: Strong(Aggregate)

- #### CancelPaymentOrder
  Use: [PaymentOrderRepository](#paymentorderrepository)
  Aggregates: [PaymentOrder](#paymentorder)
  Intent: Cancels a payment order

- #### AddPayment
  Use: [PaymentOrderRepository](#paymentorderrepository), [PaymentRepository](#paymentrepository)
  Aggregates: [PaymentOrder](#paymentorder) (validates), [Payment](#payment) (creates)
  Intent: PaymentOrder validates the intent (`assertCanAcceptPayment`), then Payment is created in its own repository. PaymentOrder updates accumulated state (`registerPendingPayment`).
  Consistency: Cross-aggregate coordination in Application Service

- #### ConfirmPayment
  Use: [PaymentRepository](#paymentrepository), [PaymentOrderRepository](#paymentorderrepository), [EventBus](#eventbus)
  Aggregates: [Payment](#payment) (transitions), [PaymentOrder](#paymentorder) (incremental update)
  Intent: Transitions Payment to COMPLETED/FAILED. Then applies incremental update to PaymentOrder (`applyPayment` or `registerFailedAttempt`). Publishes domain events.
  Input: `{ paymentId?, transactionId?, success }` — supports lookup by internal ID or external transaction ID (webhook path)

- #### ProcessPayment
  Use: [PaymentRepository](#paymentrepository), [PaymentGateway](#paymentgateway)
  Aggregates: [Payment](#payment)
  Intent: Fire-and-forget — submits payment to external gateway, links external transaction ID to Payment via `processing(transactionId)`

- #### ReconcilePayment
  Use: [PaymentGateway](#paymentgateway), [ConfirmPayment](#confirmpayment)
  Intent: Single-check query against gateway, confirms if resolved. Used by polling workers and cron jobs. Retry policy lives in the gateway adapter (infrastructure).

### Domain Ports

- #### PaymentGateway
  `requestPayment(request): Promise<string>` — submits to external processor
  `queryStatus(transactionId): Promise<GatewayTransactionStatus>` — single status check

## Domain Layer

### Aggregates

- #### PaymentOrder
  **Aggregate Root — self-sufficient, no dependency on Payment[]**

  What it is: Represents the payment process for a sale
  What it does: Validates payment intent, tracks accumulated state, determines order completion

  State (accumulated, not computed):
  - Id, SaleId, TotalAmount
  - **PaidAmount** — sum of confirmed payments
  - **PendingAmount** — sum of registered but unresolved payments
  - **FailedAttempts** — counter
  - Change, Status, CreatedAt, CompletedAt

  Operations (all O(1), no queries):
  - `assertCanAcceptPayment(amount, method)` — validates against accumulated state
  - `registerPendingPayment(amount)` — increments pendingAmount on payment creation
  - `applyPayment(amount)` — moves from pending to paid, detects COMPLETED
  - `registerFailedAttempt(amount)` — decrements pending, increments counter
  - `cancel()`, `markAsFailed()` — terminal transitions

  Invariants:
  - paidAmount + pendingAmount <= totalAmount (except cash with change)
  - COMPLETED when paidAmount >= totalAmount
  - FAILED after MAX_FAILED_ATTEMPTS (3)

- #### Payment
  **Independent aggregate — own lifecycle, own repository**

  What it is: Represents an individual payment attempt
  What it does: Manages its own state transitions independently

  State:
  - Id, **PaymentOrderId** (reference, not ownership)
  - Amount, Method, Status
  - ExternalId (linked after gateway submission)
  - CreatedAt, CompletedAt

  Operations:
  - `complete()` — PENDING → COMPLETED (requires externalId for non-cash)
  - `fail()` — PENDING → FAILED
  - `processing(externalId)` — links to external transaction (card/transfer only)

### Domain Ports

- #### PaymentOrderRepository
  `save`, `update`, `findById`, `findBySaleId`

- #### PaymentRepository
  `save`, `update`, `findById`, `findByPaymentOrderId`, `findByExternalId`

### Domain Events

- #### PaymentOrderCompleted
  Emitted: When PaymentOrder.applyPayment results in COMPLETED status
  Payload: `{ saleId: string }`

- #### PaymentOrderFailed
  Emitted: When failedAttempts >= MAX_FAILED_ATTEMPTS
  Payload: `{ saleId: string }`

- #### PaymentTransactionResult
  Emitted: After each individual payment confirmation
  Payload: `{ paymentId: string, success: boolean }`

### Value Objects / Enums

- #### PaymentMethod(enum)
  CARD | CASH | TRANSFER
- #### PaymentOrderStatus(enum)
  PENDING | PARTIAL | COMPLETED | FAILED | CANCELLED
- #### PaymentStatus(enum)
  PENDING | COMPLETED | FAILED
- #### GatewayTransactionStatus(enum)
  PENDING | SUCCEEDED | FAILED | NOT_FOUND

## Infrastructure

### Adapters

- **InMemoryPaymentOrderRepository** — implements PaymentOrderRepository
- **InMemoryPaymentRepository** — implements PaymentRepository
- **HttpPaymentGateway** — implements PaymentGateway (HTTP + retry/backoff in queryStatus)
- **WebhookHandler** — receives external gateway callbacks, delegates to ConfirmPayment
- **SSEStreamAdapter** — encapsulates SSE stream lifecycle for payment events endpoint

### API Endpoints

- `POST /api/payment/register` — AddPayment
- `POST /api/payment/process` — ProcessPayment (fire-and-forget to gateway)
- `POST /api/payment/commit` — ConfirmPayment (cash confirmation)
- `POST /api/payment/webhook` — WebhookHandler (gateway callback)
- `POST /api/payment/reconcile` — ReconcilePayment
- `GET /api/payment/status` — query PaymentOrder + Payments state
- `GET /api/payment/events` — SSE stream (payment.completed, payment.failed, payment.transaction.result)

## Integrations

### Event Handlers

- #### CreatePaymentOrderOnSaleReady
  Consumes: [SalesReadyToPay](./sales-map.md#salesreadytopay)
  Consistency: eventual
  Intent: Creates a new payment order using CreatePaymentOrder

### Design Decisions

- **Dominance in creation**: PaymentOrder validates whether a Payment can be accepted. Payment does NOT validate against PaymentOrder on its own.
- **Autonomy in confirmation**: Payment transitions independently. PaymentOrder is updated incrementally via events/use case, not by querying all Payments.
- **No inverse dependencies**: Payment references PaymentOrder via `paymentOrderId`. PaymentOrder never references Payment[].
- **External events always accepted**: A webhook confirming a payment is never rejected by PaymentOrder — the real world wins.
