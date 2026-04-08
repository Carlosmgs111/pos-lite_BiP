import type { LogbookArtifacts } from "../../../types/logbook";

export const artifacts: LogbookArtifacts = {
  boundedContexts: [
    {
      name: "Payment",
      aggregates: [
        {
          name: "PaymentOrder",
          kind: "aggregate",
          properties: [
            { name: "id", type: "UuidVO" },
            { name: "saleId", type: "UuidVO" },
            { name: "totalAmount", type: "PriceVO" },
            { name: "payments", type: "Payment[]" },
            { name: "status", type: "PaymentOrderStatus" },
            { name: "change", type: "PriceVO" },
            { name: "createdAt", type: "Date" },
            { name: "completedAt", type: "Date?" },
          ],
          invariants: [
            { rule: "Estado inicial siempre es PENDING", category: "business" },
            { rule: "Solo pagos CASH pueden exceder el total (genera cambio)", category: "business" },
            { rule: "Pagos no-cash que excedan el total son rechazados", category: "business" },
            { rule: "No se aceptan pagos si la order ya esta COMPLETED", category: "business" },
            { rule: "Transiciona a COMPLETED cuando los pagos cubren el total", category: "consistency" },
          ],
          methods: [
            "create()",
            "addPayment()",
            "getChange()",
            "getStatus()",
            "getTotalAmount()",
          ],
        },
        {
          name: "Payment",
          kind: "entity",
          properties: [
            { name: "id", type: "UuidVO" },
            { name: "method", type: "PaymentMethod" },
            { name: "amount", type: "PriceVO" },
            { name: "status", type: "PaymentStatus" },
            { name: "createdAt", type: "Date" },
          ],
          invariants: [
            { rule: "Metodo debe ser CASH, CARD o TRANSFER", category: "validation" },
            { rule: "Monto debe ser positivo", category: "validation" },
          ],
          methods: [
            "create()",
            "getAmount()",
            "getMethod()",
          ],
        },
      ],
      valueObjects: [
        {
          name: "PaymentMethod",
          shared: false,
          validations: ["CASH | CARD | TRANSFER"],
        },
        {
          name: "PaymentOrderStatus",
          shared: false,
          validations: ["PENDING | PARTIAL | COMPLETED | CANCELLED"],
        },
        {
          name: "PaymentStatus",
          shared: false,
          validations: ["PENDING | PAID | PARTIALLY_PAID | CANCELLED"],
        },
      ],
    },
  ],
  sharedValueObjects: [
    {
      name: "PriceVO",
      shared: true,
      validations: ["Non-negative", "Max 2 decimal places", "Stored as cents", "add()", "substract()", "multiply()"],
    },
    {
      name: "Result<E, T>",
      shared: true,
      validations: ["ok() | fail()", "Fuerza verificacion de isSuccess antes de getValue()"],
    },
  ],
  ports: [
    {
      name: "HandleStockPort",
      context: "Sales",
      description: "Reservar, liberar y confirmar stock en el contexto Inventory",
      adapter: "HandleStock (infrastructure)",
    },
    {
      name: "GetProductsInfo",
      context: "Sales",
      description: "Obtiene nombre y precio de productos del contexto Inventory",
      adapter: "GetProductsInfo (infrastructure)",
    },
  ],
};
