import { atom } from "nanostores";

export type PaymentFlowStatus =
  | "idle"
  | "awaiting_payment"
  | "partial"
  | "processing"
  | "completed"
  | "failed";

export interface PaymentEntry {
  id: string;
  method: string;
  amount: number;
  status: "pending" | "completed" | "failed";
}

export const $paymentStatus = atom<PaymentFlowStatus>("idle");
export const $payments = atom<PaymentEntry[]>([]);
export const $change = atom<number>(0);
export const $totalToPay = atom<number>(0);

export function resetPayment() {
  $paymentStatus.set("idle");
  $payments.set([]);
  $change.set(0);
  $totalToPay.set(0);
}

export function getPaidAmount(): number {
  return $payments
    .get()
    .filter((p) => p.status !== "failed")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function getRemainingAmount(): number {
  return Math.max(0, $totalToPay.get() - getPaidAmount());
}
