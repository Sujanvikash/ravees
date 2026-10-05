import { useToast } from '../context/ToastContext.jsx';

export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    // Phones: pinned under the header so toasts never cover the drawer's action buttons.
    // Desktop: bottom-right, stacked above the Santa that rests in that corner.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-[88px] z-[2000] flex flex-col gap-2.5 sm:inset-x-auto sm:top-auto sm:right-8 sm:bottom-[96px]"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="relative overflow-hidden rounded-lg border border-gold-400 bg-bg-dark-emerald px-5 py-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-[opacity,translate] duration-500 ease-spring starting:translate-x-12 starting:opacity-0"
        >
          {toast.message}
          {/* Shrinks over the toast's 3.2s life (ToastContext), so you can see when it will go. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-toast-progress bg-gold-400/70"
          />
        </div>
      ))}
    </div>
  );
}
