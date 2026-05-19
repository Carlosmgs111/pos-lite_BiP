import { Payment, PaymentType, PaymentStatus } from "./Payment";
import { PriceVO } from "../../shared/domain/Price.VO";

// 🛠️ FASE 3: Domain ProjectionService — Coverage State Derivado
// ! [ANTES] Los montos (paidAmount, pendingAmount, etc.) se persistían en PaymentOrder causando drift financiero
// ? [DESPUÉS] PaymentOrderSnapshot se calcula on-demand desde Payments[] — fuente financiera absoluta

/**
 * Estado de cobertura financiera pura.
 * NO es estado del workflow — solo responde: ¿cuánto dinero hay?
 */
export enum PaymentCoverageState {
  UNPAID = "UNPAID",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  FULLY_PAID = "FULLY_PAID",
  OVERPAID = "OVERPAID",
}

export interface PaymentOrderSnapshot {
  /** Total de charges COMPLETED */
  paidAmount: PriceVO;
  /** Total de charges PENDING */
  pendingAmount: PriceVO;
  /** Total de refunds COMPLETED */
  refundedAmount: PriceVO;
  /** Total de refunds PENDING */
  pendingRefundAmount: PriceVO;
  /** paidAmount - refundedAmount (invariante: nunca negativo) */
  effectivePaid: PriceVO;
  /** totalAmount - effectivePaid (si > 0, sino 0) */
  remainingAmount: PriceVO;
  /** effectivePaid - totalAmount (si > 0, sino 0) */
  change: PriceVO;
  /** Estado de cobertura financiera pura */
  coverageState: PaymentCoverageState;
  /** Hay al menos un charge PENDING */
  hasPendingCharges: boolean;
  /** Hay al menos un refund PENDING */
  hasPendingRefunds: boolean;
  /** Hay al menos un charge COMPLETED */
  hasCompletedCharges: boolean;
  /** Monto máximo refundeable (charges completados - refunds existentes) */
  refundableAmount: PriceVO;
}

/**
 * Domain Service: calcula cobertura financiera desde el ledger de Payments.
 *
 * La proyección es PURAMENTE financiera — NO decide estado del workflow.
 * PaymentOrder.status es decisión operacional explícita.
 *
 * Este servicio es determinísticamente puro:
 * - Sin repositorios
 * - Sin eventos
 * - Sin side effects
 * - Sin inferencia de lifecycle
 */
export class PaymentOrderProjectionService {
  /**
   * Calcula el snapshot financiero desde un ledger de Payments.
   *
   * Un solo recorrido del array para consistencia y eficiencia.
   *
   * @param totalAmount Monto total de la orden de pago
   * @param payments Ledger inmutable de payments asociados
   * @throws Error si refunds exceden charges (corrupción financiera)
   */
  static project(
    totalAmount: PriceVO,
    payments: Payment[]
  ): PaymentOrderSnapshot {
    let paidCents = 0;
    let pendingCents = 0;
    let refundedCents = 0;
    let pendingRefundCents = 0;
    let hasPendingCharges = false;
    let hasPendingRefunds = false;
    let hasCompletedCharges = false;

    // Un solo loop acumulador — más consistente y extensible
    for (const p of payments) {
      const amt = p.getAmount().getValueInCents();

      if (p.getType() === PaymentType.CHARGE) {
        if (p.getStatus() === PaymentStatus.COMPLETED) {
          paidCents += amt;
          hasCompletedCharges = true;
        } else if (p.getStatus() === PaymentStatus.PENDING) {
          pendingCents += amt;
          hasPendingCharges = true;
        }
      } else if (p.getType() === PaymentType.REFUND) {
        if (p.getStatus() === PaymentStatus.COMPLETED) {
          refundedCents += amt;
        } else if (p.getStatus() === PaymentStatus.PENDING) {
          pendingRefundCents += amt;
          hasPendingRefunds = true;
        }
      }
      // FAILED no aporta montos
    }

    // Invariante explícita: refunds NO pueden exceder charges completados
    // Si esto ocurre, hay corrupción financiera que debe detectarse, no ocultarse.
    const effectivePaidCents = paidCents - refundedCents;
    if (effectivePaidCents < 0) {
      throw new Error(
        `Financial inconsistency: refunds (${refundedCents}¢) exceed completed charges (${paidCents}¢) for payment order`
      );
    }

    const effectivePaid = new PriceVO(effectivePaidCents / 100);

    const totalCents = totalAmount.getValueInCents();
    const remainingCents = Math.max(0, totalCents - effectivePaidCents);
    const remainingAmount = new PriceVO(remainingCents / 100);

    const changeCents = Math.max(0, effectivePaidCents - totalCents);
    const change = new PriceVO(changeCents / 100);

    const refundableAmountCents = paidCents - refundedCents;
    // Ya validado arriba que refundableAmountCents >= 0
    const refundableAmount = new PriceVO(refundableAmountCents / 100);

    const coverageState = this.deriveCoverageState(
      effectivePaidCents,
      totalCents
    );

    return {
      paidAmount: new PriceVO(paidCents / 100),
      pendingAmount: new PriceVO(pendingCents / 100),
      refundedAmount: new PriceVO(refundedCents / 100),
      pendingRefundAmount: new PriceVO(pendingRefundCents / 100),
      effectivePaid,
      remainingAmount,
      change,
      coverageState,
      hasPendingCharges,
      hasPendingRefunds,
      hasCompletedCharges,
      refundableAmount,
    };
  }

  private static deriveCoverageState(
    effectivePaidCents: number,
    totalAmountCents: number
  ): PaymentCoverageState {
    if (effectivePaidCents <= 0) return PaymentCoverageState.UNPAID;
    if (effectivePaidCents < totalAmountCents) return PaymentCoverageState.PARTIALLY_PAID;
    if (effectivePaidCents === totalAmountCents) return PaymentCoverageState.FULLY_PAID;
    return PaymentCoverageState.OVERPAID;
  }
}
