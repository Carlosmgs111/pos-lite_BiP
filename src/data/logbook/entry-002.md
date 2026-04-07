---
title: "Entry 002 - Casos de uso, guardas de estado, event bus y contexto Payment"
date: 2026-04-01
summary: "Consolidacion de puertos de stock, eliminacion de QuantityVO, guardas de estado, propagacion de errores, event bus con SalesConfirmed, y nuevo bounded context Payment."
tags: ["ddd", "architecture", "inventory", "sales", "payment", "events", "refactor", "testing"]
testSuites: ["iter2-sales", "iter2-payment"]
closed: true
---

## Consolidacion de puertos de stock

Los tres puertos granulares (`ReserveStock`, `ReleaseStock`, `ConfirmStock`) y sus respectivos adaptadores se consolidaron en un unico `HandleStockPort` con tres operaciones: `reserveStock`, `releaseStock` y `commitStock`. En Inventory, el use case `HandleStockForSale` implementa las tres operaciones. Esto reduce de 6 archivos a 2 sin perder expresividad.

## Eliminacion de QuantityVO

Se elimino `QuantityVO` por sobreingenieria: solo envolvia un `number` con un getter y una validacion minima, sin comportamiento de dominio real. Se reemplazo por `number` directo con validaciones en los puntos correctos:

- `SaleItem.create()` valida `quantity > 0` retornando `Result.fail`
- `SaleItem.decrementQuantity()` valida que la cantidad resultante no sea negativa

El constructor de `SaleItem` se hizo `private`, forzando el uso del factory method `create()`.

## Renombramiento de estados y campos

Se renombraron conceptos para reflejar mejor el lenguaje del dominio:

- `SaleStates` → `SaleStatus`, con valores `DRAFT`, `CONFIRMED`, `CANCELLED` (antes `PENDING`, `COMPLETED`, `CANCELLED`)
- `completeSale()` → `confirmSale()`
- Campos de `SaleItem`: `id` → `productId`, `productName` → `nameSnapshot`, `price` → `priceSnapshot`, `total` → `subTotal`

## Guardas de transicion de estado en Sale

Se identifico que `Sale` no protegia sus transiciones de estado. Ahora las tres operaciones sensibles solo se permiten desde `DRAFT`:

- `confirmSale()` retorna `Result.fail` si no esta `DRAFT`
- `cancelSale()` retorna `Result.fail` si no esta `DRAFT`
- `addItem()` retorna `Result.fail` si no esta `DRAFT`

`CreateSale` valida que no exista una venta con el mismo ID.

## Fail-fast en AddItemToSale

`AddItemToSale` ahora verifica el estado de la venta **antes** de reservar stock. Esto evita reservar inventario innecesariamente cuando la venta ya no acepta operaciones. Si `getProductInfo` falla despues de reservar, se hace rollback del stock.

## Propagacion de errores de dominio

Se realizo una auditoria que revelo multiples puntos donde errores de dominio se silenciaban o no se propagaban. Los cambios:

- `Sale.create()` retorna `Result<Error, Sale>` — antes ignoraba fallos de `SaleItem.create()` y continuaba con datos incompletos
- `Sale.addItem()` retorna `Result<Error, void>` — mismo problema
- `RegisterProduct.execute()` retorna el `Result` del `registry()`
- `CreateSale.execute()` propaga errores de `Sale.create()` y `save()`

Todos los use cases de Sales ahora verifican que `getSaleById` no retorne `undefined`, retornando `SaleNotFoundError` en vez de explotar con `getValue()!`.

## Errores de dominio exportados

Se extrajeron los errores que estaban como clases privadas dentro de los archivos de dominio a `domain/Errors/`, haciendolos importables:

- **Inventory**: `InsufficientStockError`, `InvalidStockOperationError`
- **Sales**: `InvalidSaleStateError`, `InvalidQuantityError`, `SaleItemNotFoundError`
- **Payment**: `PaymentOrderNotFoundError`, `InvalidPaymentError`

## Validaciones en Product

- `releaseStock()` falla si `quantity > reservedStock`
- `confirmStock()` falla si `quantity > reservedStock`
- `reserveStock()` ya no es `async` innecesariamente

## Correccion de bugs en repositorios e infraestructura

- `InMemorySaleRepository.update()`/`delete()` — `findIndex` se comparaba consigo mismo (`sale.getId() === sale.getId()`), siempre retornaba index 0
- `HandleStockForSale.releaseStock()`/`commitStock()` — pasaban `undefined` a `productRepository.update()` porque operaban sobre el retorno de `Result<void>` en vez del producto
- `RemoveItemFromSale` ahora llama `releaseStock` despues de decrementar — antes el stock quedaba reservado sin liberar

## Mejoras al sistema de tests

- **Suites con identidad**: cada suite ahora tiene `id`, `name` y `description`. El `id` se usa como clave de registro, `name` y `description` se muestran en las tarjetas del logbook
- **Lifecycle hooks**: el runner soporta `setup` y `teardown` opcionales por suite, ejecutados antes y despues de todos los tests del suite respectivamente
- **Tests organizados por iteracion**: `package/tests/starting/` para la iteracion inicial, `package/tests/iter2/` para esta iteracion

## Event Bus y evento SalesConfirmed

Se implemento un bus de eventos en memoria (`InMemoryEventBus`) como singleton, con interfaces `EventBus` y `EventHandler<T>` en `shared/domain/bus/`. Al confirmar una venta, `RegisterSale` publica un evento `SalesConfirmed` con `saleId` y `totalAmount`. Este evento es consumido por el contexto Payment para crear automaticamente una orden de pago.

## Nuevo bounded context: Payment

Se agrego el contexto **Payment** para gestionar ordenes de pago asociadas a ventas confirmadas:

- **Agregado `PaymentOrder`**: vinculado a un `saleId`, contiene una coleccion de `Payment`, calcula cambio para pagos en efectivo, y transiciona a `COMPLETED` cuando el monto total es cubierto. Expone `getStatus()` y `getTotalAmount()` para consultas externas
- **Entidad `Payment`**: representa un pago individual con metodo (`CASH`, `CARD`, `TRANSFER`) y monto
- **`PaymentCompletedEventHandler`**: suscrito a `SalesConfirmed`, crea una `PaymentOrder` automaticamente al confirmar una venta
- **Use cases**: `CreatePaymentOrder`, `AddPayment`
- **Infraestructura**: `InMemoryPaymentOrderRepository`

### Reglas de dominio en PaymentOrder

- `addPayment()` retorna `Result<InvalidPaymentError, void>` — consistente con el patron del proyecto
- Rechaza pagos si la order ya esta `COMPLETED`
- Pagos no-cash que excedan el total retornan error controlado
- Solo pagos en efectivo (CASH) pueden exceder el total, generando cambio
- `AddPayment` (use case) valida que la `PaymentOrder` exista antes de operar, retornando `PaymentOrderNotFoundError`
- `InMemoryPaymentOrderRepository` usa `Result.fail` en vez de `throw` en `update()`/`delete()`

## Comunicacion entre contextos

La comunicacion Sales → Payment se da a traves de eventos de dominio, manteniendo los contextos desacoplados. Sales publica `SalesConfirmed` sin conocer a Payment. Payment se suscribe al evento y reacciona creando la orden de pago.

## Otros cambios

- `GetProduct` renombrado a `GetProducts` — acepta array de IDs
- `GetProductInfo` renombrado a `GetProductsInfo` — mismo cambio en el puerto de Sales
- `CreateSale` refactorizado para aceptar `itemIds` y resolver productos internamente
- `PriceVO.substract()` — nuevo metodo estatico para restar precios
- `PriceVO.getValueInCents()` — nuevo getter para acceso directo al valor en centavos
