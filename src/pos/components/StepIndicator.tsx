import type { FunctionalComponent } from "preact";

interface Step {
  id: number;
  label: string;
  icon: string;
}

const steps: Step[] = [
  { id: 1, label: "Productos", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { id: 2, label: "Carrito", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
  { id: 3, label: "Confirmar", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: 4, label: "Pago", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
];

interface Props {
  currentStep: number;
  itemCount?: number;
}

const StepIndicator: FunctionalComponent<Props> = ({ currentStep, itemCount = 0 }) => {
  return (
    <div class="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const isLast = index === steps.length - 1;
        return (
          <>
            <div class="flex flex-col items-center flex-1">
              <div
                class={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isActive
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={step.icon} />
                  </svg>
                )}
              </div>
              <span
                class={`mt-2 text-xs font-medium ${
                  isCompleted ? "text-emerald-600" : isActive ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {step.label}
                {step.id === 2 && itemCount > 0 && (
                  <span class="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full">
                    {itemCount}
                  </span>
                )}
              </span>
            </div>
            {!isLast && (
              <div class={`flex-1 h-0.5 mx-2 mb-6 ${
                isCompleted ? "bg-emerald-500" : "bg-gray-200"
              }`}></div>
            )}
          </>
        );
      })}
    </div>
  );
};

export default StepIndicator;
