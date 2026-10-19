import React from 'react';
import { STATUS_LABELS } from '../../utility/api';

const STYLES = {
    applied: 'bg-slate-100 text-slate-700 ring-slate-200',
    shortlisted: 'bg-sky-50 text-sky-700 ring-sky-200',
    interview_scheduled: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    interview_accepted: 'bg-violet-50 text-violet-700 ring-violet-200',
    selected: 'bg-amber-50 text-amber-800 ring-amber-200',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
    offer_accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    offer_declined: 'bg-orange-50 text-orange-700 ring-orange-200',
    // account statuses
    pending: 'bg-amber-50 text-amber-800 ring-amber-200',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    disabled: 'bg-rose-50 text-rose-700 ring-rose-200',
    // placement stages
    Placed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Selected: 'bg-amber-50 text-amber-800 ring-amber-200',
    'In Progress': 'bg-sky-50 text-sky-700 ring-sky-200',
    Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
    'Offer Declined': 'bg-orange-50 text-orange-700 ring-orange-200',
};

const StatusBadge = ({ status, label }) => (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STYLES[status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
        {label || STATUS_LABELS[status] || status}
    </span>
);

export default StatusBadge;
