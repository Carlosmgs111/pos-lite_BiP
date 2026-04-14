# Payment

## Index

- [Capabilities](#capabilities)
  - [CreatePaymentOrder](#createpaymentorder)
  - [CancelPaymentOrder](#cancelpaymentorder)
  - [AddPayment](#addpayment)
  - [PaymentCommit](#paymentcommit)
- [Entities](#entities)
  - [PaymentOrder (Aggregate Root)](#paymentorder-aggregate-root)
  - [Payment](#payment)
- [Domain Events](#domain-events)
  - [PaymentOrderCompleted](#paymentordercompleted)
  - [PaymentOrderFailed](#paymentorderfailed)
- [Value Objects](#value-objects)
  - [PaymentMethod](#paymentmethod)
  - [PaymentStatus](#paymentstatus)
  - [Price](./shared-map.md#price)

## Upstream / Downstream

- Sales → upstream (emits SalesReadyToPay)
- Payment → downstream (consumes SalesReadyToPay)

## Application Layer

### Capabilities

- #### CreatePaymentOrder
  Use: [PaymentOrderRepository](#paymentorderrepository)  
  Entities: [PaymentOrder](#paymentorder-aggregate-root)  
  Intent: Creates a new payment order and stores it in the repository
  Consistency: Strong(Aggregate)
- #### CancelPaymentOrder
  Use: [PaymentOrderRepository](#paymentorderrepository)  
  Entities: [PaymentOrder](#paymentorder-aggregate-root)  
  Intent: Cancels a payment order and updates its state in the repository
- #### RegisterPayment
  Use: [PaymentOrderRepository](#paymentorderrepository)  
  Entities: [PaymentOrder](#paymentorder-aggregate-root), [Payment](#payment)  
  Intent: Adds a payment to a payment order ready to be confirmed and updates its state in the repository
- #### ConfirmPayment
  Use: [PaymentOrderRepository](#paymentorderrepository)  
  Entities: [PaymentOrder](#paymentorder-aggregate-root), [Payment](#payment)  
  Intent: Confirms a payment and updates its state in the repository
- #### ConfirmExternalPayment
  Use: [PaymentOrderRepository](#paymentorderrepository)  
  Entities: [PaymentOrder](#paymentorder-aggregate-root)  
  Intent: Recieves the result of external transaction and updates the payment order state depending on the result, success or failure

### Domain Ports

## Domain Layer

### Entities

- #### PaymentOrder (Aggregate Root)

  What it is: A payment order is an aggregate root that represents the payment process for a sale
  What it does: Manages multiple payments for a sale  
  What it has:
  - [Id](#uuid)
  - [SaleId](#uuid)
  - [TotalAmount](./shared-map.md#price)
  - [Status](#paymentorderstatus)
  - [Payments](#payment)
  - [CreatedAt](DateTime)
  - [CompletedAt](DateTime)

  Invariants:
  - paidAmount <= totalAmount (excepto cash con cambio)
  - Solo cuando paidAmount == totalAmount → COMPLETED

- #### Payment
  What it is: A payment is an entity that represents a payment
  What it does: Manages the state of a payment
  What it has:
  - [Id](#uuid)
  - [RequestedAmount](./shared-map.md#price)
  - [ConfirmedAmount](./shared-map.md#price)
  - [Method](#paymentmethod)
  - [Status](#paymentstatus)

### Domain Ports

- #### PaymentOrderRepository
  **What it is:** A repository that stores payment orders  
  **What it does:** Stores payment orders in a database

### Domain Events

- #### PaymentOrderCompleted
  Emitted: When a payment order reaches full payment
  Intent: The order is now immutable and finalized
  What contains:
  - [SaleId](./sales-map.md#sale)
- #### PaymentOrderFailed
  Emitted: When a payment order fails  
  Intent: The order is now immutable and finalized
  What contains:
  - [SaleId](./sales-map.md#sale)

### Primitives

- #### PaymentMethod(enum)
  CARD | CASH | TRANSFER
- #### PaymentOrderStatus(enum)
  PENDING | partial | COMPLETED | FAILED | CANCELLED
- #### PaymentStatus(enum)
  PENDING | COMPLETED | FAILED

### State Machine

- [PaymentOrderCompleted](#paymentordercompleted)
  - [PENDING -> COMPLETED](#paymentorderstatus)
- [PaymentOrderFailed](#paymentorderfailed)
  - [PENDING -> FAILED](#paymentorderstatus)
- [PaymentOrderCancelled](#paymentordercancelled)
  - [PENDING -> CANCELLED](#paymentorderstatus)

## Integrations

### Event Handlers

- ### CreatePaymentOrderEventHandler
  Consumes:[SalesReadyToPay](./sales-map.md#salesreadytopay)
  Consistensy: eventual
  Idempotency: required (by SaleId)
  Retry: yes
  Failure handling: DLQ / retry policy
  Intent: Creates a new payment order using the [CreatePaymentOrder](#createpaymentorder) capability
