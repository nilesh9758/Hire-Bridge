import React, { useCallback, useEffect, useState } from "react";
import { Briefcase, MapPin, CalendarDays, IndianRupee, Users, Info, Trash2, FileText } from "lucide-react";
import api, { errorMessage, formatCtc, formatDate, resumeUrl } from "../../utility/api";
import StatusBadge from "../../components/common/StatusBadge";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import { useToast } from "../../components/common/Toast";
import { EmptyState, PageHeader, PageLoader, Spinner } from "../../components/ui";

const Detail = ({ label, value }) => (
    <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-sm text-slate-900">{value || 'N/A'}</dd>
    </div>
);

// All job postings made by recruiters; the admin can inspect or remove them
export default function Adminactivedrive() {
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [details, setDetails] = useState(null);
    const [jobToDelete, setJobToDelete] = useState(null);
    const { showToast, toastElement } = useToast();

    const fetchJobs = useCallback(async () => {
        try {
            const res = await api.get('/admin/jobs');
            setJobs(res.data.data || []);
        } catch (err) {
            showToast(errorMessage(err, 'Failed to load job postings'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const openDetails = async (job) => {
        setDetails({ job, applications: null });
        try {
            const res = await api.get(`/admin/jobs/${job._id}`);
            setDetails(res.data.data);
        } catch (err) {
            showToast(errorMessage(err), 'error');
            setDetails(null);
        }
    };

    const confirmDelete = async () => {
        const job = jobToDelete;
        setJobToDelete(null);
        try {
            await api.delete(`/admin/jobs/${job._id}`);
            showToast(`Removed "${job.role}" by ${job.company?.name}`, 'success');
            setDetails(null);
            fetchJobs();
        } catch (err) {
            showToast(errorMessage(err), 'error');
        }
    };

    const visible = jobs.filter((job) => filter === 'all' || (filter === 'active' ? job.isActive : !job.isActive));
    const job = details?.job;

    return (
        <>
            {toastElement}
            <PageHeader title="Job postings" description="Every opening posted by recruiters. Open a posting to see its applicants, or remove it." />
            <div className="mb-6 flex gap-2">
                {[['active', 'Open'], ['closed', 'Closed'], ['all', 'All']].map(([value, label]) => (
                    <button key={value} onClick={() => setFilter(value)} className={`chip ${filter === value ? 'chip-active' : ''}`} aria-pressed={filter === value}>{label}</button>
                ))}
            </div>

            {isLoading ? (
                <PageLoader />
            ) : visible.length === 0 ? (
                <div className="card"><EmptyState icon={Briefcase} title="No job postings here" /></div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((item) => (
                        <article key={item._id} className="card flex flex-col p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-brand-600">{item.company?.name || 'Unknown company'}</p>
                                    <h2 className="truncate text-lg font-semibold text-slate-900">{item.role}</h2>
                                </div>
                                <StatusBadge status={item.isActive ? 'active' : 'disabled'} label={item.isActive ? 'Open' : 'Closed'} />
                            </div>
                            <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
                                <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">CTC</dt><dd className="capitalize">{formatCtc(item.ctc)} · {item.type}</dd></div>
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Location</dt><dd>{item.location}</dd></div>
                                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Deadline</dt><dd>Deadline {formatDate(item.lastDate)}</dd></div>
                                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Applicants</dt><dd>{item.applicationCounts.total} applicant(s){item.applicationCounts.offer_accepted ? ` · ${item.applicationCounts.offer_accepted} placed` : ''}</dd></div>
                            </dl>
                            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                                <button onClick={() => openDetails(item)} className="btn btn-secondary btn-sm flex-1"><Info className="h-4 w-4" aria-hidden="true" /> Details</button>
                                <button onClick={() => setJobToDelete(item)} className="btn btn-danger-soft btn-sm"><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={!!details} title={job?.role} subtitle={`${job?.company?.name || ''} · ${job?.type || ''}`} onClose={() => setDetails(null)} maxWidth="max-w-3xl">
                {job && (
                    <>
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Detail label="Location" value={job.location} />
                            <Detail label="CTC / stipend" value={formatCtc(job.ctc)} />
                            <Detail label="Eligible batch" value={job.eligibleBatch} />
                            <Detail label="Minimum CGPA" value={job.minimumCgpa} />
                            <Detail label="Eligible branches" value={job.eligibleBranches?.join(', ').toUpperCase()} />
                            <Detail label="Deadline" value={formatDate(job.lastDate)} />
                            <Detail label="Recruiter email" value={job.company?.email} />
                            <Detail label="Posted on" value={formatDate(job.createdAt)} />
                        </dl>
                        <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Applicants</h3>
                        {!details.applications ? (
                            <div className="flex justify-center py-6 text-slate-400"><Spinner /></div>
                        ) : details.applications.length === 0 ? (
                            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No applications yet.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="table">
                                    <thead><tr><th>Student</th><th>Branch</th><th>CGPI</th><th>Status</th><th>Resume</th></tr></thead>
                                    <tbody>
                                        {details.applications.map((a) => (
                                            <tr key={a._id}>
                                                <td><p className="font-medium text-slate-900">{a.student?.name}</p><p className="text-xs text-slate-500">{a.student?.email}</p></td>
                                                <td className="uppercase">{a.student?.branch}</td>
                                                <td>{a.student?.cgpi}</td>
                                                <td><StatusBadge status={a.status} /></td>
                                                <td>{a.resume?.fileName && <a className="link inline-flex items-center gap-1" href={resumeUrl.application(a._id)} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" aria-hidden="true" /> PDF</a>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setJobToDelete(job)} className="btn btn-danger"><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove this posting</button>
                        </div>
                    </>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={!!jobToDelete}
                title="Remove job posting?"
                message={`"${jobToDelete?.role}" by ${jobToDelete?.company?.name || 'this recruiter'} and all its applications will be permanently removed.`}
                confirmLabel="Remove posting"
                danger
                onConfirm={confirmDelete}
                onCancel={() => setJobToDelete(null)}
            />
        </>
    );
}
