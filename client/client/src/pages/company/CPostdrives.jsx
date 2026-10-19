import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import api, { errorMessage } from "../../utility/api";
import { useToast } from "../../components/common/Toast";
import { Alert, Field, PageHeader, SectionCard, Spinner } from "../../components/ui";

const EMPTY = {
    role: '', type: 'full-time', ctc: '', lastDate: '', location: '',
    eligibleBranches: '', eligibleBatch: '', minimumCgpa: '',
};
const BRANCH_SUGGESTIONS = ['all', 'it', 'ece', 'it-bi', 'cse'];

const today = () => new Date().toISOString().slice(0, 10);

export default function CPostdrives() {
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { showToast, toastElement } = useToast();
    const navigate = useNavigate();

    const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const toggleBranch = (branch) => {
        const current = form.eligibleBranches.split(',').map((b) => b.trim().toLowerCase()).filter(Boolean);
        const next = current.includes(branch) ? current.filter((b) => b !== branch) : [...current, branch];
        setForm({ ...form, eligibleBranches: next.join(', ') });
    };
    const selectedBranches = form.eligibleBranches.split(',').map((b) => b.trim().toLowerCase()).filter(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const missing = Object.entries(form).find(([, v]) => !String(v).trim());
        if (missing) {
            setError('Please fill in every field.');
            return;
        }
        const cgpa = Number(form.minimumCgpa);
        if (!(cgpa >= 0 && cgpa <= 10)) {
            setError('Minimum CGPA must be between 0 and 10.');
            return;
        }
        setIsSaving(true);
        try {
            const res = await api.post('/company/jobs', form);
            showToast(res.data?.message || 'Drive posted', 'success');
            setForm(EMPTY);
            setTimeout(() => navigate('/company/current-drives'), 800);
        } catch (err) {
            setError(errorMessage(err, 'Could not post the drive'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {toastElement}
            <PageHeader title="Post a new drive" description="Students who match the eligibility rules will be able to apply." />
            <div className="grid gap-6 lg:grid-cols-3">
                <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2" noValidate>
                    <SectionCard title="Role">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Job title" htmlFor="role" className="sm:col-span-2"><input id="role" className="input" value={form.role} onChange={update('role')} placeholder="e.g. Software Engineer" required /></Field>
                            <Field label="Job type" htmlFor="type">
                                <select id="type" className="input" value={form.type} onChange={update('type')}>
                                    <option value="full-time">Full-time</option>
                                    <option value="internship">Internship</option>
                                    <option value="part-time">Part-time</option>
                                </select>
                            </Field>
                            <Field label="Location" htmlFor="location"><input id="location" className="input" value={form.location} onChange={update('location')} placeholder="e.g. Bengaluru or Remote" required /></Field>
                            <Field label="CTC / stipend (INR)" htmlFor="ctc" hint="Annual CTC, or monthly stipend for internships"><input id="ctc" type="number" min="0" className="input" value={form.ctc} onChange={update('ctc')} placeholder="1200000" required /></Field>
                            <Field label="Application deadline" htmlFor="lastDate"><input id="lastDate" type="date" min={today()} className="input" value={form.lastDate} onChange={update('lastDate')} required /></Field>
                        </div>
                    </SectionCard>
                    <SectionCard title="Eligibility">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Eligible branches" htmlFor="eligibleBranches" hint="Comma-separated, or pick below. Use “all” for every branch." className="sm:col-span-2">
                                <input id="eligibleBranches" className="input" value={form.eligibleBranches} onChange={update('eligibleBranches')} placeholder="it, ece" required />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {BRANCH_SUGGESTIONS.map((b) => (
                                        <button type="button" key={b} onClick={() => toggleBranch(b)} className={`chip uppercase ${selectedBranches.includes(b) ? 'chip-active' : ''}`} aria-pressed={selectedBranches.includes(b)}>{b}</button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Eligible batch (graduating year)" htmlFor="eligibleBatch"><input id="eligibleBatch" type="number" className="input" value={form.eligibleBatch} onChange={update('eligibleBatch')} placeholder="2027" required /></Field>
                            <Field label="Minimum CGPA" htmlFor="minimumCgpa"><input id="minimumCgpa" type="number" step="0.1" min="0" max="10" className="input" value={form.minimumCgpa} onChange={update('minimumCgpa')} placeholder="7.5" required /></Field>
                        </div>
                    </SectionCard>
                    {error && <Alert tone="error">{error}</Alert>}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setForm(EMPTY)} className="btn btn-secondary">Reset</button>
                        <button type="submit" disabled={isSaving} className="btn btn-primary">
                            {isSaving ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                            {isSaving ? 'Posting...' : 'Publish drive'}
                        </button>
                    </div>
                </form>
                <aside className="lg:col-span-1">
                    <div className="card card-body sticky top-6 bg-gradient-to-br from-brand-50 to-white">
                        <h2 className="font-semibold text-slate-900">Tips</h2>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                            <li>• Only students whose branch, batch and CGPA match can apply.</li>
                            <li>• The drive closes automatically after the deadline.</li>
                            <li>• Applicants&apos; resumes appear under <strong>Applications</strong>.</li>
                            <li>• The placement cell can see and moderate all postings.</li>
                        </ul>
                    </div>
                </aside>
            </div>
        </>
    );
}
