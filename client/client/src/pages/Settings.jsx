import React, { useState } from 'react';
import { Check, KeyRound } from 'lucide-react';
import { Alert, Avatar, Field, PageHeader, SectionCard, Spinner } from '../components/ui';
import api, { errorMessage } from '../utility/api';
import { useAuth, ROLE_LABELS } from '../utility/AuthContext';

const PASSWORD_RULES = [
    { test: (p) => p.length >= 8, label: 'At least 8 characters' },
    { test: (p) => /[A-Za-z]/.test(p), label: 'Contains a letter' },
    { test: (p) => /\d/.test(p), label: 'Contains a number' },
];

// Account settings for every role
export default function Settings() {
    const { user, role } = useAuth();
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [status, setStatus] = useState({ tone: '', text: '' });
    const [isSaving, setIsSaving] = useState(false);

    const rulesOk = PASSWORD_RULES.every((r) => r.test(form.newPassword));
    const matches = form.newPassword && form.newPassword === form.confirmPassword;
    const canSubmit = form.currentPassword && rulesOk && matches && !isSaving;
    const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setStatus({ tone: '', text: '' });
        try {
            const res = await api.put('/auth/change-password', {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            setStatus({ tone: 'success', text: res.data?.message || 'Password changed' });
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setStatus({ tone: 'error', text: errorMessage(err, 'Could not change the password') });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <PageHeader title="Settings" description="Manage your account and password." />
            <div className="grid gap-6 lg:grid-cols-3">
                <SectionCard title="Account" className="h-fit">
                    <div className="flex items-center gap-4">
                        <Avatar name={user?.name} size="h-14 w-14 text-lg" />
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{user?.name}</p>
                            <p className="truncate text-sm text-slate-500">{user?.email}</p>
                            <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{ROLE_LABELS[role]}</span>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Change password" description="Other devices using your old session will need to sign in again." className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                        <Field label="Current password" htmlFor="current-password">
                            <input id="current-password" type="password" autoComplete="current-password" className="input" value={form.currentPassword} onChange={update('currentPassword')} required />
                        </Field>
                        <Field label="New password" htmlFor="new-password">
                            <input id="new-password" type="password" autoComplete="new-password" className="input" value={form.newPassword} onChange={update('newPassword')} required />
                            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                {PASSWORD_RULES.map((rule) => {
                                    const ok = rule.test(form.newPassword);
                                    return (
                                        <li key={rule.label} className={`flex items-center gap-1 text-xs ${ok ? 'text-emerald-600' : 'text-slate-500'}`}>
                                            <Check className={`h-3.5 w-3.5 ${ok ? '' : 'opacity-30'}`} aria-hidden="true" /> {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        </Field>
                        <Field
                            label="Confirm new password"
                            htmlFor="confirm-password"
                            error={form.confirmPassword && !matches ? 'Passwords do not match' : ''}
                        >
                            <input id="confirm-password" type="password" autoComplete="new-password" className="input" value={form.confirmPassword} onChange={update('confirmPassword')} required />
                        </Field>
                        {status.text && <Alert tone={status.tone}>{status.text}</Alert>}
                        <button type="submit" disabled={!canSubmit} className="btn btn-primary">
                            {isSaving ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
                            {isSaving ? 'Saving...' : 'Update password'}
                        </button>
                    </form>
                </SectionCard>
            </div>
        </>
    );
}
