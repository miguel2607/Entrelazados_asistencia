import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const bg = type === 'error' ? 'bg-[#d93025]' : type === 'success' ? 'bg-[#1e8e3e]' : 'bg-[#323232]';
  return (
    <div className={`fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md px-6 py-3.5 text-sm text-white shadow-[0_3px_5px_-1px_rgba(0,0,0,0.2),0_6px_10px_0_rgba(0,0,0,0.14),0_1px_18px_0_rgba(0,0,0,0.12)] ${bg}`}>
      {message}
    </div>
  );
}
