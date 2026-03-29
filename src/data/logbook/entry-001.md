---
title: "Entry 001 - Definicion de bounded contexts"
date: 2026-03-28
summary: "Identificacion inicial de los contextos Inventory y Order, definicion de agregados, value objects e invariantes del sistema POS.", 
tags: ["ddd", "architecture", "inventory", "order"]
testSuites: ["inventory", "order", "shared"]
closed: false
---

## Contextos identificados

Se identificaron dos bounded contexts iniciales para el sistema POS:

**Inventory** — Gestiona el catalogo de productos, precios y control de stock. El agregado principal es `Product`, que protege invariantes de negocio como la no-negatividad del stock y la coherencia entre stock disponible y reservado.

**Order** — Gestiona el ciclo de vida de las ordenes de venta. El agregado `Order` compone `OrderItem` como entidades internas y mantiene la consistencia del total calculado.

## Comunicacion entre contextos

El contexto Order depende de Inventory a traves de ports (interfaces) definidos en su capa de aplicacion: `GetProductInfo` y `ReserveStock`. La implementacion concreta vive en la capa de infraestructura de Order, siguiendo el patron de puertos y adaptadores.

## Decisiones de arquitectura

- **Monolito modular**: ambos contextos viven en el mismo repositorio pero con fronteras claras
- **Result type**: manejo de errores funcional sin excepciones, forzando al caller a verificar exito antes de acceder al valor
- **Value Objects compartidos**: `PriceVO` vive en shared/domain ya que ambos contextos lo necesitan
- **Cero dependencias**: toda la logica de dominio es TypeScript puro, sin librerias externas

## Naturaleza evolutiva

Estos contextos son una primera aproximacion. Conforme el proyecto evolucione e itere con analisis mas profundo, los limites pueden cambiar, nuevos contextos pueden emerger, y las reglas de negocio se refinaran.
