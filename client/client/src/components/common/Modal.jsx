import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const Modal = ({ isOpen, title, subtitle, onClose, children, maxWidth = 'max-w-lg' }) => {
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        document.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`max-h-[92vh] w-full ${maxWidth} animate-fade-in overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
};

export const ConfirmDialog = ({ isOpen, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => {
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && onCancel?.();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={onCancel}>
            <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-md animate-fade-in rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex gap-4">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${danger ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-600'}`}>
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                        <p className="mt-1 text-sm text-slate-600">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
                    <button onClick={onConfirm} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
