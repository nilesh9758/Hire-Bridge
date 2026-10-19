import React, { useCallback, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
    if (!message) return null;
    const isSuccess = type === 'success';
    const Icon = isSuccess ? CheckCircle2 : AlertCircle;
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm animate-fade-in items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
        >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${isSuccess ? 'text-emerald-500' : 'text-rose-500'}`} aria-hidden="true" />
            <p className="flex-1 text-sm font-medium text-slate-800">{message}</p>
            <button onClick={onClose} className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Dismiss">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

export const useToast = () => {
    const [toast, setToast] = useState({ message: '', type: '' });

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast((current) => (current.message === message ? { message: '', type: '' } : current)), 5000);
    }, []);

    const toastElement = <Toast {...toast} onClose={() => setToast({ message: '', type: '' })} />;
    return { showToast, toastElement };
};

export default Toast;
