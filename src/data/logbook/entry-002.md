---
title: "Entry 002 - Casos de uso, guardas de estado y simplificacion del dominio"
date: 2026-04-01
summary: "Consolidacion de puertos de stock, eliminacion de QuantityVO, guardas de transicion de estado en Sale, y mejoras al sistema de tests."
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

Se identifico que `Sale` no protegia sus transiciones de estado. Ahora:

- `cancelSale()` retorna `Result.fail` si la venta ya esta `COMPLETED`
- `CancelSale` (use case) verifica el resultado antes de liberar stock
- `CreateSale` valida que no exista una venta con el mismo ID

Esto previene escenarios como cancelar una venta ya confirmada, que causaba liberacion de stock ya committed (dejando `reservedStock` en negativo).

## Mejoras al sistema de tests

- **Suites con identidad**: cada suite ahora tiene `id`, `name` y `description`. El `id` se usa como clave de registro, `name` y `description` se muestran en las tarjetas del logbook
- **Lifecycle hooks**: el runner soporta `setup` y `teardown` opcionales por suite, ejecutados antes y despues de todos los tests del suite respectivamente
- **Tests organizados por iteracion**: `package/tests/starting/` para la iteracion inicial, `package/tests/iter2/` para esta iteracion

## Otros cambios

- `GetProduct` renombrado a `GetProducts` — acepta array de IDs
- `GetProductInfo` renombrado a `GetProductsInfo` — mismo cambio en el puerto de Sales
- `CreateSale` refactorizado para aceptar `itemIds` y resolver productos internamente
