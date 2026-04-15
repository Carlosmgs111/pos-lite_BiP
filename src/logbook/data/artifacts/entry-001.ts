import type { LogbookArtifacts } from "../../types/logbook";

export const artifacts: LogbookArtifacts = {
  boundedContexts: [
    {
      name: "Inventory",
      aggregates: [
        {
          name: "Product",
          properties: [
            { name: "id", type: "UuidVO" },
            { name: "name", type: "NameVO" },
            { name: "price", type: "PriceVO" },
            { name: "stock", type: "number" },
            { name: "reservedStock", type: "number" },
          ],
          invariants: [
            { rule: "Stock no puede ser negativo", category: "business" },
            {
              rule: "Cantidad reservada no puede exceder stock disponible",
              category: "business",
            },
            {
              rule: "Name debe tener minimo 3 caracteres",
              category: "validation",
            },
          ],
          methods: [
            "reserveStock()",
            "releaseStock()",
            "getStock()",
            "canReserveStock()",
          ],
        },
      ],
      valueObjects: [
        {
          name: "NameVO",
          shared: false,
          validations: ["Non-empty", "Min 3 characters"],
        },
      ],
    },
    {
      name: "Sales",
      aggregates: [
        {
          name: "Sale",
          properties: [
            { name: "id", type: "string" },
            { name: "items", type: "SaleItem[]" },
            { name: "total", type: "PriceVO" },
            { name: "state", type: "OrdersStates" },
            { name: "createdAt", type: "Date" },
          ],
          invariants: [
            {
              rule: "Total se recalcula al agregar/remover items",
              category: "consistency",
            },
            { rule: "Estado inicial siempre es PENDING", category: "business" },
          ],
          methods: [
            "create()",
            "addItem()",
            "removeItem()",
            "findItemById()",
            "calculateTotal()",
          ],
        },
      ],
      valueObjects: [],
    },
  ],
  sharedValueObjects: [
    {
      name: "PriceVO",
      shared: true,
      validations: ["Non-negative", "Max 2 decimal places", "Stored as cents"],
    },
    {
      name: "UuidVO",
      shared: true,
      validations: ["Non-empty", "UUID format"],
    },
  ],
  ports: [
    {
      name: "GetProductInfo",
      context: "Sales",
      description:
        "Obtiene nombre y precio de un producto del contexto Inventory",
      adapter: "GetProductInfo (infrastructure)",
    },
    {
      name: "ReserveStock",
      context: "Sales",
      description: "Reserva stock de un producto en el contexto Inventory",
      adapter: "ReserveStock (infrastructure)",
    },
  ],
};
