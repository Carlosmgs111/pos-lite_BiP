---
title: "Entry 001 - Definicion de bounded contexts"
date: 2026-03-28
summary: "Identificacion inicial de los contextos Inventory y Order, definicion de agregados, value objects e invariantes del sistema POS."
tags: ["ddd", "architecture", "inventory", "sales"]
testSuites: ["starting-inventory", "starting-sales", "starting-shared"]
closed: true
closedDate: 2026-04-01
---

## Contextos identificados

Se identificaron dos bounded contexts iniciales para el sistema POS:

**Inventory** — Gestiona el catalogo de productos, precios y control de stock. El agregado principal es `Product`, que protege invariantes de negocio como la no-negatividad del stock y la coherencia entre stock disponible y reservado.

**Sales** — Gestiona el ciclo de vida de las ordenes de venta. El agregado `Sale` compone `SaleItem` como entidades internas y mantiene la consistencia del total calculado.

## Comunicacion entre contextos

El contexto Sales depende de Inventory a traves de ports (interfaces) definidos en su capa de aplicacion: `GetProductInfo` y `ReserveStock`. La implementacion concreta vive en la capa de infraestructura de Sales, siguiendo el patron de puertos y adaptadores.

## Decisiones de arquitectura

- **Monolito modular**: ambos contextos viven en el mismo repositorio pero con fronteras claras
- **Result type**: manejo de errores funcional sin excepciones, forzando al caller a verificar exito antes de acceder al valor
- **Value Objects compartidos**: `PriceVO` vive en shared/domain ya que ambos contextos lo necesitan
- **Cero dependencias**: toda la logica de dominio es TypeScript puro, sin librerias externas
- **Ports y adaptadores**: la capa de aplicacion define interfaces para la comunicacion entre contextos, que son implementadas en la capa de infraestructura

## Decisiones de diseño

- **Verificacion de existencia de entidad**: se hacen desde la capa de aplicacion, no desde el repositorio

## Naturaleza evolutiva

Estos contextos son una primera aproximacion. Conforme el proyecto evolucione e itere con analisis mas profundo, los limites pueden cambiar, nuevos contextos pueden emerger, y las reglas de negocio se refinaran.
