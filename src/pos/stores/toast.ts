import { atom } from "nanostores";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let counter = 0;

export const $toasts = atom<Toast[]>([]);

export function showToast(message: string, type: ToastType = "info", duration = 3000) {
  const id = `toast-${++counter}`;
  $toasts.set([...$toasts.get(), { id, message, type }]);
  setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id: string) {
  $toasts.set($toasts.get().filter((t) => t.id !== id));
}
