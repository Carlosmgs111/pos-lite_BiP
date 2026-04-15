import { useStore } from "@nanostores/preact";
import { $toasts, dismissToast } from "../stores/toast";

const typeStyles: Record<string, string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-800 text-white",
};

export default function ToastContainer() {
  const toasts = useStore($toasts);

  if (toasts.length === 0) return null;

  return (
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-xs">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          class={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center justify-between gap-3 animate-slide-in ${typeStyles[toast.type]}`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            class="opacity-70 hover:opacity-100 text-xs"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
