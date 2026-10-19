import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CalendarClock, Video, MapPin, FileText, PartyPopper, Check } from 'lucide-react';
import api, { errorMessage, formatCtc, formatDate, formatDateTime } from '../../utility/api';
import StatusBadge from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { EmptyState, PageHeader, PageLoader } from '../../components/ui';

const PROGRESSED = ['shortlisted', 'interview_scheduled', 'interview_accepted', 'selected', 'offer_accepted', 'offer_declined'];
const STAGES = [
    { key: 'applied', label: 'Applied' },
    { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer' },
];
const stageIndex = (status) => ({
    applied: 0, shortlisted: 1, interview_scheduled: 2, interview_accepted: 2, selected: 3, offer_accepted: 3, offer_declined: 3,
}[status] ?? 0);

const Progress = ({ status }) => {
    if (status === 'rejected') return null;
    // An accepted offer completes every step
    const current = status === 'offer_accepted' ? STAGES.length : stageIndex(status);
    return (
        <ol className="mt-4 flex items-center gap-2" aria-label="Application progress">
            {STAGES.map((stage, i) => (
                <li key={stage.key} className="flex flex-1 items-center gap-2">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${i <= current ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {i < current ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className={`hidden text-xs font-medium sm:inline ${i <= current ? 'text-slate-800' : 'text-slate-400'}`}>{stage.label}</span>
                    {i < STAGES.length - 1 && <span className={`h-px flex-1 ${i < current ? 'bg-brand-600' : 'bg-slate-200'}`} />}
                </li>
            ))}
        </ol>
    );
};

// The student's applications. With shortlistedOnly, only those past the "applied" stage are shown.
const AppliedJobs = ({ shortlistedOnly = false }) => {
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState('');
    const { showToast, toastElement } = useToast();

    const fetchApplications = useCallback(async () => {
        try {
            const res = await api.get('/student/applications');
            setApplications(res.data?.data || []);
        } catch (error) {
            showToast(errorMessage(error, 'Failed to load your applications'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    const runAction = async (id, request) => {
        setBusy(id);
        try {
            const res = await request();
            showToast(res.data?.message || 'Done', 'success');
            await fetchApplications();
        } catch (error) {
            showToast(errorMessage(error), 'error');
        } finally {
            setBusy('');
            setConfirm(null);
        }
    };

    const acceptInterview = (a) => runAction(a.applicationId, () => api.patch(`/student/applications/${a.applicationId}/interview/accept`));
    const respondToOffer = (a, decision) => runAction(a.applicationId, () => api.patch(`/student/applications/${a.applicationId}/offer`, { decision }));
    const withdraw = (a) => runAction(a.applicationId, () => api.post(`/student/withdraw-application/${a._id}`));

    const visible = applications.filter((a) =>
        (!shortlistedOnly || PROGRESSED.includes(a.status)) &&
        `${a.companyName} ${a.role}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {toastElement}
            <PageHeader
                title={shortlistedOnly ? 'Interviews & offers' : 'My applications'}
                description={shortlistedOnly
                    ? 'Accept scheduled interviews and respond to offers.'
                    : 'Track every application from submission to offer.'}
            />

            <div className="relative mb-6 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input type="search" aria-label="Search applications" placeholder="Search by company or role" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-9" />
            </div>

            {isLoading ? (
                <PageLoader />
            ) : visible.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={shortlistedOnly ? CalendarClock : FileText}
                        title={shortlistedOnly ? 'No interviews or offers yet' : "You haven't applied yet"}
                        description={shortlistedOnly ? 'When a recruiter shortlists you, the next steps will appear here.' : 'Browse open drives and apply to the ones you are eligible for.'}
                        action={!shortlistedOnly && <Link to="/student/active-jobs" className="btn btn-primary">Browse openings</Link>}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {visible.map((a) => (
                        <article key={a.applicationId} className="card p-5 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-brand-600">{a.companyName}</p>
                                    <h2 className="text-lg font-semibold text-slate-900">{a.role}</h2>
                                    <p className="mt-0.5 text-sm capitalize text-slate-500">{a.type} · {a.location} · {formatCtc(a.ctc)} · applied {formatDate(a.appliedAt)}</p>
                                </div>
                                <StatusBadge status={a.status} />
                            </div>
                            <Progress status={a.status} />

                            {a.interview?.scheduledAt && a.status !== 'shortlisted' && (
                                <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm">
                                    <p className="flex items-center gap-2 font-semibold text-indigo-900"><CalendarClock className="h-4 w-4" aria-hidden="true" /> Interview · {formatDateTime(a.interview.scheduledAt)}</p>
                                    <p className="mt-2 flex items-start gap-2 break-all text-indigo-900/80">
                                        {a.interview.mode === 'online'
                                            ? <><Video className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><a className="underline" href={a.interview.venue} target="_blank" rel="noopener noreferrer">{a.interview.venue}</a></>
                                            : <><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{a.interview.venue}</>}
                                    </p>
                                    {a.interview.notes && <p className="mt-2 text-indigo-900/80">{a.interview.notes}</p>}
                                    {a.status === 'interview_scheduled' ? (
                                        <button onClick={() => acceptInterview(a)} disabled={busy === a.applicationId} className="btn btn-primary btn-sm mt-3">Accept interview</button>
                                    ) : a.interview.acceptedAt && (
                                        <p className="mt-2 font-medium text-emerald-700">You accepted on {formatDateTime(a.interview.acceptedAt)}</p>
                                    )}
                                </div>
                            )}

                            {a.status === 'selected' && (
                                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="flex items-center gap-2 font-semibold text-amber-900"><PartyPopper className="h-4 w-4" aria-hidden="true" /> {a.companyName} has offered you this role</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button onClick={() => setConfirm({ a, decision: 'accept' })} className="btn btn-success btn-sm">Accept offer</button>
                                        <button onClick={() => setConfirm({ a, decision: 'decline' })} className="btn btn-danger-soft btn-sm">Decline</button>
                                    </div>
                                </div>
                            )}
                            {a.status === 'offer_accepted' && <p className="mt-4 text-sm font-semibold text-emerald-700">You accepted this offer 🎉</p>}
                            {a.status === 'offer_declined' && <p className="mt-4 text-sm text-orange-700">You declined this offer.</p>}
                            {a.status === 'rejected' && <p className="mt-4 text-sm text-rose-700">The recruiter did not move forward with this application.</p>}
                            {a.status === 'applied' && (
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                                    <span>Waiting for the recruiter to review your application.</span>
                                    <button onClick={() => setConfirm({ a, decision: 'withdraw' })} className="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700">Withdraw</button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirm}
                title={confirm?.decision === 'accept' ? 'Accept this offer?' : confirm?.decision === 'decline' ? 'Decline this offer?' : 'Withdraw application?'}
                message={confirm?.decision === 'accept'
                    ? `You will be marked as placed at ${confirm?.a.companyName}. This cannot be undone.`
                    : confirm?.decision === 'decline'
                        ? `${confirm?.a.companyName} will be told you declined. This cannot be undone.`
                        : `Your application to ${confirm?.a.companyName} will be removed.`}
                confirmLabel={confirm?.decision === 'accept' ? 'Accept offer' : confirm?.decision === 'decline' ? 'Decline offer' : 'Withdraw'}
                danger={confirm?.decision !== 'accept'}
                onConfirm={() => (confirm.decision === 'withdraw' ? withdraw(confirm.a) : respondToOffer(confirm.a, confirm.decision))}
                onCancel={() => setConfirm(null)}
            />
        </>
    );
};

export default AppliedJobs;
