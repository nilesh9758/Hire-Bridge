import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Inbox, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { LOGO_PATH, LOGO_VIEWBOX } from './logoPath';

export const Logo = ({ className = '', dark = false, withText = true }) => (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 shadow-sm">
            <svg width="22" height="22" viewBox={LOGO_VIEWBOX} fill="none" aria-hidden="true">
                <path d={LOGO_PATH} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </span>
        {withText && (
            <span className={`text-base font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                Hire<span className="text-brand-500">Bridge</span>
            </span>
        )}
    </span>
);

export const PageHeader = ({ title, description, actions, eyebrow }) => (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
            {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-600 sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
);

const TONES = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
};

export const StatCard = ({ label, value, icon: Icon, tone = 'brand', to, hint, highlight = false }) => {
    const content = (
        <div className={`card card-body flex h-full items-start gap-4 transition ${to ? 'hover:-translate-y-0.5 hover:shadow-md' : ''} ${highlight ? 'ring-2 ring-amber-300' : ''}`}>
            {Icon && (
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
            )}
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value ?? '–'}</p>
                {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
            </div>
        </div>
    );
    return to ? <Link to={to} className="block rounded-2xl">{content}</Link> : content;
};

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
            <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
    </div>
);

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;

export const PageLoader = ({ label = 'Loading...' }) => (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500" role="status">
        <Spinner className="h-7 w-7 text-brand-600" />
        <span className="text-sm">{label}</span>
    </div>
);

export const FullScreenLoader = () => (
    <div className="grid min-h-screen place-items-center bg-slate-50" role="status">
        <div className="flex flex-col items-center gap-4">
            <Logo />
            <Spinner className="h-6 w-6 text-brand-600" />
        </div>
    </div>
);

const ALERT_STYLES = {
    info: ['border-sky-200 bg-sky-50 text-sky-900', Info],
    success: ['border-emerald-200 bg-emerald-50 text-emerald-900', CheckCircle2],
    warning: ['border-amber-200 bg-amber-50 text-amber-900', AlertTriangle],
    error: ['border-rose-200 bg-rose-50 text-rose-900', AlertCircle],
};

export const Alert = ({ tone = 'info', title, children, className = '' }) => {
    const [style, Icon] = ALERT_STYLES[tone];
    return (
        <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${style} ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
            </div>
        </div>
    );
};

export const Avatar = ({ name = '', size = 'h-9 w-9 text-sm' }) => {
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
    return (
        <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-teal-500 font-semibold text-white ${size}`} aria-hidden="true">
            {initials}
        </span>
    );
};

export const Field = ({ label, htmlFor, hint, error, children, className = '' }) => (
    <div className={className}>
        {label && <label htmlFor={htmlFor} className="label">{label}</label>}
        {children}
        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
);

export const SectionCard = ({ title, description, children, actions, className = '' }) => (
    <section className={`card ${className}`}>
        {(title || actions) && (
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
                </div>
                {actions}
            </div>
        )}
        <div className="card-body">{children}</div>
    </section>
);
