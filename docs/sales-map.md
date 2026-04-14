# Sales 

## Index

- [Capabilities](#capabilities)
- [Entities](#entities)
- [Domain Events](#domain-events)

## Downstream / Upstream

- Sales → upstream (emits SalesReadyToPay)
- Payment → downstream (consumes SalesReadyToPay)

## Application Layer

### Capabilities

- #### CreateSale
  Use: [SaleRepository](#salerepository), [GetProductsInfo](#getproductsinfo)  
  Entities: [Sale](#sale-aggregate-root)  
  Intent: Creates a new sale and stores it in the repository
  Consistency: Strong(Aggregate)
- #### CancelSale
  Use: [SaleRepository](#salerepository), [HandleStock](#handlestock)  
  Entities: [Sale](#sale-aggregate-root)  
  Intent: Cancels a sale and updates its state in the repository
  Consistency: Strong(Aggregate)
- #### AddItemToSale
  Use: [SaleRepository](#salerepository), [GetProductsInfo](#getproductsinfo), [HandleStock](#handlestock)  
  Entities: [Sale](#sale-aggregate-root)  
  Intent: Adds an item to the sale and stores it in the repository
  Consistency: Strong(Aggregate)
- #### RemoveItemFromSale
  Use: [SaleRepository](#salerepository), [HandleStock](#handlestock)  
  Entities: [Sale](#sale-aggregate-root)  
  Intent: Removes an item from the sale and stores it in the repository
  Consistency: Strong(Aggregate)
- #### RegisterSale
  Use: [SaleRepository](#salerepository), [HandleStock](#handlestock)  
  Entities: [Sale](#sale-aggregate-root)  
  Intent: Registers a sale and updates its state in the repository
  Consistency: Strong(Aggregate)
- #### CompleteSale
  Use: [SaleRepository](#salerepository), [HandleStock](#handlestock)  
  Entities: [Sale](#sale-aggregate-root)  
  Intent: Completes a sale and updates its state in the repository
  Consistency: Strong(Aggregate)
- #### FailSale
  Use: [SaleRepository](#salerepository), [HandleStock](#handlestock)  
  Entities: [Sale](#sale-aggregate-root)  
  Intent: Fails a sale and updates its state in the repository
  Consistency: Strong(Aggregate)
- #### GetSale
  Use: [SaleRepository](#salerepository)  
  Entities: [Sale](#sale-aggregate-root)  
  Intent: Gets a sale from the repository
  Consistency: Strong(Aggregate)

### Application Ports

- #### GetProductsInfo
  Intent: Retrieves product information from the repository
  Consistency: Strong(Aggregate)
- #### HandleStock
  Intent: Handles stock for a sale
  Consistency: Strong(Aggregate)

## Domain Layer

### Entities

- #### Sale (Aggregate Root)
  What it is: A sale is an aggregate root that represents a sale
  What it does: Manages the sale process
  What it has: 
  - [Id](#uuid)
  - [TotalAmount](#price)
  - [PaymentMethod](#paymentmethod)
  - [PaymentStatus](#paymentstatus)
  - [Payment](#payment)

### Domain Events

- #### SalesReadyToPay
  What it is: A domain event that is published when a sale is ready to pay
  What it does: Updates the sale status to ready to pay
  What contains: 
  - [SaleId](#uuid)
  - [TotalAmount](#price)