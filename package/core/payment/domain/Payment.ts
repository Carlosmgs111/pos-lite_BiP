import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";
import { InvalidPaymentError } from "./Errors/InvalidPaymentError";

// 🛠️ FASE 1: Domain Payment — Payment Ledger Inmutable
// ! [ANTES] Payment no tenía tipo, settlementSource, ni soporte para refunds como entradas separadas
// ? [DESPUÉS] Payment es ledger inmutable con PaymentType (CHARGE/REFUND), PaymentSettlementSource, y createRefund()

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  TRANSFER = "TRANSFER",
}

export enum PaymentType {
  CHARGE = "CHARGE",
  REFUND = "REFUND",
}

export enum PaymentSettlementSource {
  GATEWAY = "GATEWAY",
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  INTERNAL_ADJUSTMENT = "INTERNAL_ADJUSTMENT",
  OTHER = "OTHER",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export type PaymentProps = {
  id: string;
  paymentOrderId: string;
  method: PaymentMethod;
  amount: number;
  settlementSource?: PaymentSettlementSource;
};

export class Payment {
  private constructor(
    private id: UuidVO,
    private paymentOrderId: string,
    private type: PaymentType,
    private method: PaymentMethod,
    private amount: PriceVO,
    private status: PaymentStatus,
    private version: number,
    private createdAt: Date,
    private settlementSource?: PaymentSettlementSource,
    private externalReference?: string,
    private notes?: string,
    private originalPaymentId?: string,
    private externalId?: string,
    private completedAt?: Date
  ) {}

  static create(props: {
    id: string;
    paymentOrderId: string;
    method: PaymentMethod;
    amount: number;
    settlementSource?: PaymentSettlementSource;
  }) {
    return new Payment(
      new UuidVO(props.id),
      props.paymentOrderId,
      PaymentType.CHARGE,
      props.method,
      new PriceVO(props.amount),
      PaymentStatus.PENDING,
      0,
      new Date(),
      props.method === PaymentMethod.CASH
        ? PaymentSettlementSource.CASH
        : props.settlementSource
    );
  }

  /**
   * LIMITACIÓN: 1 refund → 1 charge via originalPaymentId.
   * amount <= refundableAmount (original amount - ya refundeado).
   *
   * Futuro: RefundAllocation para N refunds ↔ N charges.
   */
  static createRefund(props: {
    id: string;
    paymentOrderId: string;
    originalPaymentId: string;
    method: PaymentMethod;
    amount: number;
  }) {
    return new Payment(
      new UuidVO(props.id),
      props.paymentOrderId,
      PaymentType.REFUND,
      props.method,
      new PriceVO(props.amount),
      PaymentStatus.PENDING,
      0,
      new Date(),
      undefined,
      undefined,
      undefined,
      props.originalPaymentId
    );
  }

  static reconstitute(props: {
    id: string;
    paymentOrderId: string;
    type: PaymentType;
    method: PaymentMethod;
    amount: number;
    status: PaymentStatus;
    version: number;
    createdAt: Date;
    settlementSource?: PaymentSettlementSource;
    externalReference?: string;
    notes?: string;
    originalPaymentId?: string;
    externalId?: string;
    completedAt?: Date;
  }): Payment {
    return new Payment(
      new UuidVO(props.id),
      props.paymentOrderId,
      props.type,
      props.method,
      new PriceVO(props.amount),
      props.status,
      props.version,
      new Date(props.createdAt),
      props.settlementSource,
      props.externalReference,
      props.notes,
      props.originalPaymentId,
      props.externalId,
      props.completedAt ? new Date(props.completedAt) : undefined
    );
  }

  private ensureMethodConstraints(): Result<InvalidPaymentError, void> {
    console.log("[Payment.ensureMethodConstraints] Payment", this);
    if (this.method !== PaymentMethod.CASH && !this.externalId) {
      return Result.fail(
        new InvalidPaymentError("Non-cash payments require an external ID")
      );
    }
    return Result.ok(undefined);
  }

  complete(): Result<InvalidPaymentError, void> {
    const methodValidation = this.ensureMethodConstraints();
    if (!methodValidation.isSuccess) return methodValidation;

    if (this.status === PaymentStatus.COMPLETED) {
      return Result.ok(undefined);
    }

    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError("Can only complete a pending payment")
      );
    }

    this.status = PaymentStatus.COMPLETED;
    this.completedAt = new Date();
    this.version++;

    return Result.ok(undefined);
  }

  processing(externalId: string): Result<InvalidPaymentError, void> {
    if (this.type !== PaymentType.CHARGE) {
      return Result.fail(
        new InvalidPaymentError("Only charge payments can be processed")
      );
    }
    if (this.method === PaymentMethod.CASH) {
      return Result.fail(
        new InvalidPaymentError(
          "Only card and transfer payments can be processed"
        )
      );
    }
    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError("Can only process a pending payment")
      );
    }
    if (this.externalId) {
      if (this.externalId === externalId) return Result.ok(undefined);
      return Result.fail(
        new InvalidPaymentError("Payment already has an external ID")
      );
    }
    this.externalId = externalId;
    this.version++;
    return Result.ok(undefined);
  }

  fail(): Result<InvalidPaymentError, void> {
    if (this.status === PaymentStatus.FAILED) {
      return Result.ok(undefined);
    }
    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError("Can only fail a pending payment")
      );
    }
    this.status = PaymentStatus.FAILED;
    this.version++;
    return Result.ok(undefined);
  }

  markAsSettled(
    settlementSource: PaymentSettlementSource,
    externalReference?: string,
    notes?: string
  ): Result<InvalidPaymentError, void> {
    if (this.status === PaymentStatus.COMPLETED) {
      if (
        this.settlementSource === settlementSource &&
        this.externalReference === externalReference
      ) {
        return Result.ok(undefined);
      }
      return Result.fail(
        new InvalidPaymentError(
          "Refund already completed with different settlement"
        )
      );
    }
    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError("Can only settle a pending payment")
      );
    }
    if (this.type !== PaymentType.REFUND) {
      return Result.fail(
        new InvalidPaymentError("Can only settle a refund payment")
      );
    }
    this.settlementSource = settlementSource;
    this.externalReference = externalReference;
    this.notes = notes;
    this.status = PaymentStatus.COMPLETED;
    this.completedAt = new Date();
    this.version++;
    return Result.ok(undefined);
  }

  getVersion() {
    return this.version;
  }
  getPaymentOrderId() {
    return this.paymentOrderId;
  }
  getExternalId() {
    return this.externalId;
  }
  getAmount() {
    return this.amount;
  }
  getMethod() {
    return this.method;
  }
  getStatus() {
    return this.status;
  }
  getId() {
    return this.id;
  }
  getType() {
    return this.type;
  }
  getSettlementSource() {
    return this.settlementSource;
  }
  getExternalReference() {
    return this.externalReference;
  }
  getNotes() {
    return this.notes;
  }
  getOriginalPaymentId() {
    return this.originalPaymentId;
  }
  getCreatedAt() {
    return this.createdAt;
  }
  getCompletedAt() {
    return this.completedAt;
  }
}
