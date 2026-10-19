import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import api, { errorMessage } from "../../utility/api";
import { Alert, Field, PageHeader, PageLoader, SectionCard, Spinner } from "../../components/ui";

export default function CUpdate() {
    const [form, setForm] = useState({ name: '', email: '', phone: '', website: '', address: '' });
    const [isComplete, setIsComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState({ tone: '', text: '' });

    useEffect(() => {
        api.get('/company/profile')
            .then((res) => {
                const p = res.data.data || {};
                setForm({ name: p.name || '', email: p.email || '', phone: p.phone || '', website: p.website || '', address: p.address || '' });
                setIsComplete(Boolean(p.isProfileComplete));
            })
            .catch((err) => setStatus({ tone: 'error', text: errorMessage(err, 'Failed to load your profile') }))
            .finally(() => setIsLoading(false));
    }, []);

    const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setStatus({ tone: '', text: '' });
        try {
            const { name, phone, website, address } = form;
            const res = await api.put('/company/profile', { name, phone, website, address });
            setIsComplete(Boolean(res.data.data?.isProfileComplete));
            setStatus({ tone: 'success', text: 'Company profile updated' });
        } catch (err) {
            setStatus({ tone: 'error', text: errorMessage(err, 'Failed to update profile') });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <PageLoader label="Loading profile..." />;

    return (
        <>
            <PageHeader
                title="Company profile"
                description="Shown to the placement cell and to students who apply to your drives."
                actions={isComplete
                    ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Profile complete</span>
                    : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">Profile incomplete</span>}
            />
            <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
                <SectionCard title="Company details">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Company name" htmlFor="c-name"><input id="c-name" className="input" value={form.name} onChange={update('name')} required /></Field>
                        <Field label="Email" htmlFor="c-email" hint="Contact the admin to change your email."><input id="c-email" className="input" value={form.email} disabled /></Field>
                        <Field label="Contact number" htmlFor="c-phone"><input id="c-phone" type="tel" className="input" value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" /></Field>
                        <Field label="Website" htmlFor="c-website"><input id="c-website" type="url" className="input" value={form.website} onChange={update('website')} placeholder="https://example.com" /></Field>
                        <Field label="Address" htmlFor="c-address" className="sm:col-span-2">
                            <textarea id="c-address" rows={3} className="input" value={form.address} onChange={update('address')} />
                        </Field>
                    </div>
                </SectionCard>
                {status.text && <Alert tone={status.tone}>{status.text}</Alert>}
                <div className="flex justify-end">
                    <button type="submit" disabled={isSaving} className="btn btn-primary">
                        {isSaving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                        {isSaving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </form>
        </>
    );
}
