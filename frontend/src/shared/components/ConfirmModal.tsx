import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDanger = true,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-6 animate-scale-in">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {isDanger && (
            <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 ring-8 ring-rose-50/50">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          )}
          <p className="text-sm text-[#4b5563] font-medium leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-[#e2e8f0]">
          <button
            type="button"
            onClick={onClose}
            className="google-button-secondary w-full sm:w-auto order-2 sm:order-1"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full sm:w-auto order-1 sm:order-2 px-6 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-95 ${
              isDanger
                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                : 'bg-[#2d1b69] text-white hover:bg-[#4c1d95] shadow-indigo-200'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

