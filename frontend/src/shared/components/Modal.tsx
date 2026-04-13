import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  alignTop?: boolean;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md', alignTop = false }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-[#111827]/40 backdrop-blur-[2px] p-4 ${alignTop ? 'items-start pt-6 sm:pt-8' : 'items-start sm:items-center pt-10 sm:pt-4'}`}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] flex flex-col transform rounded-2xl bg-white shadow-2xl animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#e2e8f0] px-6 py-5 sm:px-8">
          <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#4b5563] transition-all hover:bg-indigo-100 hover:text-[#2d1b69]"
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 text-[#4b5563] font-medium custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}


