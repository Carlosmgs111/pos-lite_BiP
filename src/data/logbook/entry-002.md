---
title: "Entry 002 - Casos de uso, guardas de estado y simplificacion del dominio"
date: 2026-04-01
summary: "Consolidacion de puertos de stock, eliminacion de QuantityVO, guardas de estado, propagacion de errores de dominio, correccion de bugs en repositorios, y mejoras al sistema de tests."
tags: ["ddd", "architecture", "inventory", "sales", "refactor", "testing"]
testSuites: ["iter2-sales"]
closed: false
---

## Consolidacion de puertos de stock

Los tres puertos granulares (`ReserveStock`, `ReleaseStock`, `ConfirmStock`) y sus respectivos adaptadores se consolidaron en un unico `HandleStockPort` con tres operaciones: `reserveStock`, `releaseStock` y `commitStock`. En Inventory, el use case `HandleStockForSale` implementa las tres operaciones. Esto reduce de 6 archivos a 2 sin perder expresividad.

## Eliminacion de QuantityVO

Se elimino `QuantityVO` por sobreingenieria: solo envolvia un `number` con un getter y una validacion minima, sin comportamiento de dominio real. Se reemplazo por `number` directo con validaciones en los puntos correctos:

- `SaleItem.create()` valida `quantity > 0` retornando `Result.fail`
- `SaleItem.decrementQuantity()` valida que la cantidad resultante no sea negativa

El constructor de `SaleItem` se hizo `private`, forzando el uso del factory method `create()`.

## Guardas de transicion de estado en Sale

Se identifico que `Sale` no protegia sus transiciones de estado. Ahora las tres operaciones sensibles solo se permiten desde `PENDING`:

- `completeSale()` retorna `Result.fail` si no esta `PENDING`
- `cancelSale()` retorna `Result.fail` si no esta `PENDING`
- `addItem()` retorna `Result.fail` si no esta `PENDING`

`CreateSale` valida que no exista una venta con el mismo ID. Esto previene escenarios como cancelar una venta ya confirmada, que causaba liberacion de stock ya committed (dejando `reservedStock` en negativo).

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

## Otros cambios

- `GetProduct` renombrado a `GetProducts` — acepta array de IDs
- `GetProductInfo` renombrado a `GetProductsInfo` — mismo cambio en el puerto de Sales
- `CreateSale` refactorizado para aceptar `itemIds` y resolver productos internamente
