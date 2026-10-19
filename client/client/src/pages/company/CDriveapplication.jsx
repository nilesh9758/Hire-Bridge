import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, CalendarClock, Mail, Star, CheckCircle2, XCircle, Users, UserRound } from "lucide-react";
import api, { errorMessage, formatCtc, formatDateTime, resumeUrl, STATUS_LABELS } from "../../utility/api";
import StatusBadge from "../../components/common/StatusBadge";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import { useToast } from "../../components/common/Toast";
import { Avatar, EmptyState, Field, PageHeader, PageLoader, Spinner } from "../../components/ui";

const FINAL_STATUSES = ['offer_accepted', 'offer_declined'];
const FILTERS = ['all', 'applied', 'shortlisted', 'interview_scheduled', 'interview_accepted', 'selected', 'offer_accepted', 'offer_declined', 'rejected'];

const StudentDetails = ({ student }) => {
    const rows = [
        ['Email', student.email], ['Phone', student.phone], ['Roll no', student.rollNo],
        ['Degree', student.degree?.toUpperCase()], ['Branch', student.branch?.toUpperCase()], ['Graduating year', student.graduatingYear],
        ['CGPI', student.cgpi], ['10th marks', student.tenthMarks && `${student.tenthMarks}%`], ['12th marks', student.twelfthMarks && `${student.twelfthMarks}%`],
    ];
    return (
        <dl className="grid grid-cols-2 gap-4">
            {rows.map(([label, value]) => (
                <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="mt-0.5 break-words text-sm text-slate-900">{value || 'N/A'}</dd>
                </div>
            ))}
        </dl>
    );
};

// Local datetime string for <input type="datetime-local">
const toLocalInput = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
};

const InterviewForm = ({ application, onSubmit, onCancel }) => {
    const existing = application.interview?.scheduledAt ? application.interview : null;
    const [form, setForm] = useState({
        scheduledAt: existing ? toLocalInput(existing.scheduledAt) : '',
        mode: existing?.mode || 'online',
        venue: existing?.venue || '',
        notes: existing?.notes || '',
        sendEmail: true,
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        await onSubmit({ ...form, scheduledAt: new Date(form.scheduledAt).toISOString() });
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Date and time" htmlFor="iv-when">
                <input id="iv-when" type="datetime-local" required min={toLocalInput(new Date())} value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="input" />
            </Field>
            <fieldset>
                <legend className="label">Mode</legend>
                <div className="grid grid-cols-2 gap-2">
                    {['online', 'offline'].map((mode) => (
                        <label key={mode} className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium capitalize ${form.mode === mode ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <input type="radio" name="mode" value={mode} checked={form.mode === mode} onChange={() => setForm({ ...form, mode })} className="sr-only" />
                            {mode}
                        </label>
                    ))}
                </div>
            </fieldset>
            <Field label={form.mode === 'online' ? 'Meeting link' : 'Location'} htmlFor="iv-venue">
                <input id="iv-venue" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    placeholder={form.mode === 'online' ? 'https://meet.google.com/...' : 'Room 101, Admin Block'} className="input" />
            </Field>
            <Field label="Notes for the student (optional)" htmlFor="iv-notes">
                <textarea id="iv-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
            </Field>
            <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" className="rounded border-slate-300 text-brand-600" checked={form.sendEmail} onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })} />
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" /> Email the details to {application.student.email}
            </label>
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isSaving} className="btn btn-primary">
                    {isSaving && <Spinner className="h-4 w-4" />}
                    {existing ? 'Reschedule interview' : 'Schedule interview'}
                </button>
            </div>
        </form>
    );
};

export default function CDriveApplication() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [allJobs, setAllJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [detailsFor, setDetailsFor] = useState(null);
    const [interviewFor, setInterviewFor] = useState(null);
    const [decision, setDecision] = useState(null);
    const [isLoadingJobs, setIsLoadingJobs] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [busy, setBusy] = useState('');
    const { showToast, toastElement } = useToast();

    const selectedJobId = searchParams.get('job') || allJobs[0]?._id || '';
    const selectJob = (id) => setSearchParams(id ? { job: id } : {}, { replace: true });

    useEffect(() => {
        api.get('/company/jobs')
            .then((res) => setAllJobs(res.data?.data || []))
            .catch((err) => showToast(errorMessage(err, 'Failed to fetch jobs'), 'error'))
            .finally(() => setIsLoadingJobs(false));
    }, [showToast]);

    const fetchApplications = useCallback(async () => {
        if (!selectedJobId) return setApplications([]);
        setIsLoading(true);
        try {
            const res = await api.get(`/company/jobs/${selectedJobId}/applications`);
            setApplications(res.data?.data || []);
        } catch (err) {
            showToast(errorMessage(err, 'Failed to fetch applicants'), 'error');
            setApplications([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedJobId, showToast]);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    const selectedJob = useMemo(() => allJobs.find((job) => job._id === selectedJobId), [allJobs, selectedJobId]);

    const runAction = async (id, request) => {
        setBusy(id);
        try {
            const res = await request();
            showToast(res.data?.message || 'Updated', 'success');
            await fetchApplications();
            return res.data?.data;
        } catch (err) {
            showToast(errorMessage(err), 'error');
            return null;
        } finally {
            setBusy('');
        }
    };

    const shortlist = (application) => runAction(application._id, () => api.patch(`/company/applications/${application._id}/shortlist`));
    const scheduleInterview = async (payload) => {
        const updated = await runAction(interviewFor._id, () => api.post(`/company/applications/${interviewFor._id}/interview`, payload));
        if (updated) setInterviewFor(null);
    };
    const confirmDecision = async () => {
        const { application, value } = decision;
        setDecision(null);
        await runAction(application._id, () => api.patch(`/company/applications/${application._id}/decision`, { decision: value }));
    };

    const counts = useMemo(() => applications.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {}), [applications]);
    const visible = applications.filter((a) => statusFilter === 'all' || a.status === statusFilter);

    if (isLoadingJobs) return <PageLoader />;

    return (
        <>
            {toastElement}
            <PageHeader title="Applications" description="Review resumes, shortlist candidates, schedule interviews and record your decision." />

            {allJobs.length === 0 ? (
                <div className="card"><EmptyState icon={Users} title="No drives yet" description="Post a drive to start receiving applications." /></div>
            ) : (
                <>
                    <div className="card card-body mb-6 flex flex-col gap-4 lg:flex-row lg:items-end">
                        <Field label="Drive" htmlFor="job-filter" className="flex-1">
                            <select id="job-filter" value={selectedJobId} onChange={(e) => selectJob(e.target.value)} className="input">
                                {allJobs.map((job) => <option key={job._id} value={job._id}>{job.role} ({job.type})</option>)}
                            </select>
                        </Field>
                        <Field label="Status" htmlFor="status-filter" className="lg:w-64">
                            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
                                {FILTERS.map((f) => <option key={f} value={f}>{f === 'all' ? `All statuses (${applications.length})` : `${STATUS_LABELS[f]} (${counts[f] || 0})`}</option>)}
                            </select>
                        </Field>
                    </div>
                    {selectedJob && (
                        <p className="mb-4 text-sm text-slate-500">
                            {selectedJob.location} · {formatCtc(selectedJob.ctc)} · Batch {selectedJob.eligibleBatch} · Min CGPA {selectedJob.minimumCgpa} · {applications.length} applicant(s)
                        </p>
                    )}

                    {isLoading ? (
                        <PageLoader label="Loading applicants..." />
                    ) : visible.length === 0 ? (
                        <div className="card"><EmptyState icon={Users} title="No applicants in this view" description="Applications for this drive will appear here." /></div>
                    ) : (
                        <div className="space-y-4">
                            {visible.map((application) => {
                                const { student, status, interview } = application;
                                const isFinal = FINAL_STATUSES.includes(status);
                                const isBusy = busy === application._id;
                                return (
                                    <article key={application._id} className="card p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <Avatar name={student.name} size="h-11 w-11 text-sm" />
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-semibold text-slate-900">{student.name}</h3>
                                                        <StatusBadge status={status} />
                                                    </div>
                                                    <p className="mt-0.5 text-sm uppercase text-slate-500">{student.degree} · {student.branch} · CGPI {student.cgpi} · {student.graduatingYear}</p>
                                                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                                        {application.resume?.fileName ? (
                                                            <a href={resumeUrl.application(application._id)} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                                                                <FileText className="h-4 w-4" aria-hidden="true" /> Resume
                                                            </a>
                                                        ) : <span className="text-slate-400">No resume</span>}
                                                        <button onClick={() => setDetailsFor(student)} className="link inline-flex items-center gap-1"><UserRound className="h-4 w-4" aria-hidden="true" /> Details</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {status === 'applied' && (
                                                    <button onClick={() => shortlist(application)} disabled={isBusy} className="btn btn-primary btn-sm"><Star className="h-4 w-4" aria-hidden="true" /> Shortlist</button>
                                                )}
                                                {['shortlisted', 'interview_scheduled', 'interview_accepted'].includes(status) && (
                                                    <button onClick={() => setInterviewFor(application)} disabled={isBusy} className="btn btn-primary btn-sm">
                                                        <CalendarClock className="h-4 w-4" aria-hidden="true" /> {status === 'shortlisted' ? 'Schedule interview' : 'Reschedule'}
                                                    </button>
                                                )}
                                                {!isFinal && status !== 'selected' && (
                                                    <button onClick={() => setDecision({ application, value: 'selected' })} disabled={isBusy} className="btn btn-success btn-sm"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Select</button>
                                                )}
                                                {!isFinal && status !== 'rejected' && (
                                                    <button onClick={() => setDecision({ application, value: 'rejected' })} disabled={isBusy} className="btn btn-danger-soft btn-sm"><XCircle className="h-4 w-4" aria-hidden="true" /> Reject</button>
                                                )}
                                            </div>
                                        </div>

                                        {interview?.scheduledAt && (
                                            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-900">
                                                <p className="font-semibold">Interview · {formatDateTime(interview.scheduledAt)} · <span className="capitalize">{interview.mode}</span></p>
                                                <p className="mt-0.5 break-all text-indigo-900/80">{interview.venue}</p>
                                                {interview.notes && <p className="mt-0.5 text-indigo-900/80">Notes: {interview.notes}</p>}
                                                <p className="mt-1 text-xs text-indigo-900/70">
                                                    {interview.acceptedAt ? `Accepted by the student on ${formatDateTime(interview.acceptedAt)}` : status === 'interview_scheduled' ? 'Waiting for the student to accept' : ''}
                                                    {interview.emailSent && ' · Email sent'}
                                                    {interview.emailPreviewUrl && (
                                                        <> (<a href={interview.emailPreviewUrl} target="_blank" rel="noopener noreferrer" className="underline">view test email</a>)</>
                                                    )}
                                                    {interview.emailError && <span className="text-rose-600"> · Email failed</span>}
                                                </p>
                                            </div>
                                        )}
                                        {status === 'offer_accepted' && <p className="mt-3 text-sm font-semibold text-emerald-700">The student accepted your offer.</p>}
                                        {status === 'offer_declined' && <p className="mt-3 text-sm font-semibold text-orange-700">The student declined your offer.</p>}
                                        {status === 'selected' && <p className="mt-3 text-sm text-amber-800">Offer sent. Waiting for the student to accept or decline.</p>}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            <Modal isOpen={!!detailsFor} title={detailsFor?.name} subtitle="Candidate details" onClose={() => setDetailsFor(null)} maxWidth="max-w-md">
                {detailsFor && <StudentDetails student={detailsFor} />}
            </Modal>
            <Modal
                isOpen={!!interviewFor}
                title={interviewFor?.interview?.scheduledAt ? 'Reschedule interview' : 'Schedule interview'}
                subtitle={`${interviewFor?.student?.name} · ${selectedJob?.role || ''}`}
                onClose={() => setInterviewFor(null)}
            >
                {interviewFor && <InterviewForm application={interviewFor} onSubmit={scheduleInterview} onCancel={() => setInterviewFor(null)} />}
            </Modal>
            <ConfirmDialog
                isOpen={!!decision}
                title={decision?.value === 'selected' ? 'Select this candidate?' : 'Reject this candidate?'}
                message={decision?.value === 'selected'
                    ? `${decision?.application.student.name} will receive an offer and can accept or decline it on the portal.`
                    : `${decision?.application.student.name} will be notified that they were not selected.`}
                confirmLabel={decision?.value === 'selected' ? 'Select & send offer' : 'Reject'}
                danger={decision?.value === 'rejected'}
                onConfirm={confirmDecision}
                onCancel={() => setDecision(null)}
            />
        </>
    );
}
