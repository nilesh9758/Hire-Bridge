import React, { useCallback, useEffect, useState } from "react";
import { Megaphone, Send, Trash2, Users, GraduationCap, Building2 } from "lucide-react";
import api, { errorMessage, formatDateTime } from "../../utility/api";
import { ConfirmDialog } from "../../components/common/Modal";
import { useToast } from "../../components/common/Toast";
import { EmptyState, Field, PageHeader, SectionCard, Spinner } from "../../components/ui";

const AUDIENCES = [
    { value: 'all', label: 'Everyone', icon: Users },
    { value: 'students', label: 'Students', icon: GraduationCap },
    { value: 'recruiters', label: 'Recruiters', icon: Building2 },
];
const AUDIENCE_LABEL = { all: 'Students & recruiters', students: 'Students only', recruiters: 'Recruiters only' };

export default function Notices() {
    const [notices, setNotices] = useState([]);
    const [form, setForm] = useState({ title: '', message: '', audience: 'all' });
    const [isSaving, setIsSaving] = useState(false);
    const [noticeToDelete, setNoticeToDelete] = useState(null);
    const { showToast, toastElement } = useToast();

    const fetchNotices = useCallback(() => {
        api.get('/admin/notices')
            .then((res) => setNotices(res.data.data || []))
            .catch((err) => showToast(errorMessage(err), 'error'));
    }, [showToast]);

    useEffect(() => { fetchNotices(); }, [fetchNotices]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/admin/notices', form);
            showToast('Notice posted', 'success');
            setForm({ title: '', message: '', audience: form.audience });
            fetchNotices();
        } catch (err) {
            showToast(errorMessage(err), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        const notice = noticeToDelete;
        setNoticeToDelete(null);
        try {
            await api.delete(`/admin/notices/${notice._id}`);
            showToast('Notice deleted', 'success');
            fetchNotices();
        } catch (err) {
            showToast(errorMessage(err), 'error');
        }
    };

    return (
        <>
            {toastElement}
            <PageHeader title="Notices" description="Notices appear on the dashboards of the audience you choose." />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <SectionCard title="Post a notice" className="h-fit lg:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Field label="Title" htmlFor="notice-title">
                            <input id="notice-title" required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
                        </Field>
                        <Field label="Message" htmlFor="notice-message">
                            <textarea id="notice-message" required rows={5} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input" />
                        </Field>
                        <fieldset>
                            <legend className="label">Audience</legend>
                            <div className="grid grid-cols-3 gap-2">
                                {AUDIENCES.map(({ value, label, icon: Icon }) => (
                                    <label key={value} className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition ${form.audience === value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                        <input type="radio" name="audience" value={value} checked={form.audience === value} onChange={() => setForm({ ...form, audience: value })} className="sr-only" />
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <button type="submit" disabled={isSaving || !form.title.trim() || !form.message.trim()} className="btn btn-primary w-full">
                            {isSaving ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                            {isSaving ? 'Posting...' : 'Post notice'}
                        </button>
                    </form>
                </SectionCard>

                <div className="space-y-4 lg:col-span-3">
                    {notices.length === 0 && <div className="card"><EmptyState icon={Megaphone} title="No notices posted yet" /></div>}
                    {notices.map((notice) => (
                        <article key={notice._id} className="card p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-slate-900">{notice.title}</h3>
                                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        <time dateTime={notice.createdAt}>{formatDateTime(notice.createdAt)}</time>
                                        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">{AUDIENCE_LABEL[notice.audience]}</span>
                                    </p>
                                </div>
                                <button onClick={() => setNoticeToDelete(notice)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete notice ${notice.title}`}>
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{notice.message}</p>
                        </article>
                    ))}
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!noticeToDelete}
                title="Delete notice?"
                message={`"${noticeToDelete?.title}" will be removed for everyone.`}
                confirmLabel="Delete"
                danger
                onConfirm={confirmDelete}
                onCancel={() => setNoticeToDelete(null)}
            />
        </>
    );
}
