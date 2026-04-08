import type { LogbookArtifacts } from "../../../types/logbook";

export const artifacts: LogbookArtifacts = {
  boundedContexts: [
    {
      name: "Sales",
      aggregates: [
        {
          name: "Sale",
          properties: [
            { name: "id", type: "string" },
            { name: "items", type: "SaleItem[]" },
            { name: "total", type: "PriceVO" },
            { name: "status", type: "SaleStatus" },
            { name: "createdAt", type: "Date" },
          ],
          invariants: [
            { rule: "Estado inicial siempre es DRAFT", category: "business" },
            { rule: "Solo se pueden agregar items en estado DRAFT", category: "business" },
            { rule: "confirmSale() solo desde DRAFT → READY_TO_PAY", category: "business" },
            { rule: "completeSale() solo desde READY_TO_PAY → COMPLETED", category: "business" },
            { rule: "cancelSale() solo desde DRAFT → CANCELLED", category: "business" },
          ],
          methods: [
            "create()",
            "addItem()",
            "confirmSale()",
            "completeSale()",
            "cancelSale()",
            "recalculateTotal()",
          ],
        },
      ],
      valueObjects: [
        {
          name: "SaleStatus",
          shared: false,
          validations: ["DRAFT | READY_TO_PAY | CANCELLED | COMPLETED"],
        },
      ],
    },
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
          ],
          invariants: [
            { rule: "Estado inicial PENDING, sin pagos", category: "business" },
            { rule: "Pago parcial transiciona a PARTIAL", category: "business" },
            { rule: "Pagos que cubren el total transicionan a COMPLETED", category: "business" },
            { rule: "No se aceptan pagos en estado COMPLETED", category: "business" },
          ],
          methods: [
            "create()",
            "addPayment()",
            "getStatus()",
            "getChange()",
          ],
        },
      ],
      valueObjects: [
        {
          name: "PaymentOrderStatus",
          shared: false,
          validations: ["PENDING | PARTIAL | COMPLETED | CANCELLED"],
        },
      ],
    },
  ],
  sharedValueObjects: [
    {
      name: "EventBus",
      shared: true,
      validations: ["publish(event)", "subscribe(eventName, handler)"],
    },
    {
      name: "InMemoryEventBus",
      shared: true,
      validations: ["Singleton", "Map<string, EventHandler[]>"],
    },
  ],
  ports: [],
  domainEvents: [
    {
      name: "SalesReadyToPay",
      publisher: "Sales",
      subscriber: "Payment",
      description: "Confirmar venta crea PaymentOrder automaticamente",
    },
    {
      name: "PaymentOrderCompleted",
      publisher: "Payment",
      subscriber: "Sales",
      description: "Pago completo transiciona Sale a COMPLETED",
    },
  ],
  stateMachines: [
    {
      entity: "Sale",
      states: ["DRAFT", "READY_TO_PAY", "COMPLETED", "CANCELLED"],
      transitions: [
        { from: "DRAFT", to: "READY_TO_PAY", trigger: "confirmSale()" },
        { from: "READY_TO_PAY", to: "COMPLETED", trigger: "PaymentOrderCompleted event" },
        { from: "DRAFT", to: "CANCELLED", trigger: "cancelSale()" },
      ],
    },
    {
      entity: "PaymentOrder",
      states: ["PENDING", "PARTIAL", "COMPLETED", "CANCELLED"],
      transitions: [
        { from: "PENDING", to: "PARTIAL", trigger: "addPayment() parcial" },
        { from: "PARTIAL", to: "PARTIAL", trigger: "addPayment() parcial" },
        { from: "PENDING", to: "COMPLETED", trigger: "addPayment() cubre total" },
        { from: "PARTIAL", to: "COMPLETED", trigger: "addPayment() cubre total" },
      ],
    },
  ],
};
