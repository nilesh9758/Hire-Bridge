import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, CalendarDays, IndianRupee, Info, Trash2, Users, PlusCircle } from "lucide-react";
import api, { errorMessage, formatCtc, formatDate } from "../../utility/api";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import { useToast } from "../../components/common/Toast";
import StatusBadge from "../../components/common/StatusBadge";
import { EmptyState, PageHeader, PageLoader } from "../../components/ui";

const Detail = ({ label, value }) => (
    <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-sm text-slate-900">{value || 'N/A'}</dd>
    </div>
);

export function CCurrentdrives() {
    const [drives, setDrives] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobToDelete, setJobToDelete] = useState(null);
    const [filter, setFilter] = useState('open');
    const { showToast, toastElement } = useToast();

    const fetchDrives = useCallback(async () => {
        try {
            const res = await api.get('/company/jobs');
            setDrives(res.data?.data || []);
        } catch (err) {
            showToast(errorMessage(err, 'Error fetching drives'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchDrives(); }, [fetchDrives]);

    const confirmDelete = async () => {
        try {
            await api.delete(`/company/jobs/${jobToDelete._id}`);
            showToast('Drive deleted', 'success');
            setSelectedJob(null);
            fetchDrives();
        } catch (err) {
            showToast(errorMessage(err, 'Failed to delete drive'), 'error');
        } finally {
            setJobToDelete(null);
        }
    };

    const isOpen = (job) => new Date(job.lastDate) >= new Date();
    const visible = drives.filter((d) => filter === 'all' || (filter === 'open' ? isOpen(d) : !isOpen(d)));

    return (
        <>
            {toastElement}
            <PageHeader
                title="My drives"
                description="Openings you have posted."
                actions={<Link to="/company/post-drive" className="btn btn-primary"><PlusCircle className="h-4 w-4" aria-hidden="true" /> Post a drive</Link>}
            />
            <div className="mb-6 flex gap-2">
                {[['open', 'Open'], ['closed', 'Closed'], ['all', 'All']].map(([value, label]) => (
                    <button key={value} onClick={() => setFilter(value)} className={`chip ${filter === value ? 'chip-active' : ''}`} aria-pressed={filter === value}>{label}</button>
                ))}
            </div>

            {isLoading ? (
                <PageLoader />
            ) : visible.length === 0 ? (
                <div className="card">
                    <EmptyState icon={Briefcase} title="No drives here" description="Post a drive to start receiving applications." action={<Link to="/company/post-drive" className="btn btn-primary">Post a drive</Link>} />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((drive) => (
                        <article key={drive._id} className="card flex flex-col p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-semibold text-slate-900">{drive.role}</h2>
                                    <p className="text-sm capitalize text-slate-500">{drive.type}</p>
                                </div>
                                <StatusBadge status={isOpen(drive) ? 'active' : 'disabled'} label={isOpen(drive) ? 'Open' : 'Closed'} />
                            </div>
                            <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
                                <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">CTC</dt><dd>{formatCtc(drive.ctc)}</dd></div>
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Location</dt><dd>{drive.location}</dd></div>
                                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Deadline</dt><dd>Deadline {formatDate(drive.lastDate)}</dd></div>
                                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Applicants</dt><dd>{drive.appliedStudents?.length || 0} applicant(s)</dd></div>
                            </dl>
                            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                                <button onClick={() => setSelectedJob(drive)} className="btn btn-secondary btn-sm flex-1"><Info className="h-4 w-4" aria-hidden="true" /> Details</button>
                                <Link to={`/company/drive-application?job=${drive._id}`} className="btn btn-secondary btn-sm flex-1"><Users className="h-4 w-4" aria-hidden="true" /> Applicants</Link>
                                <button onClick={() => setJobToDelete(drive)} className="btn btn-danger-soft btn-sm" aria-label={`Delete ${drive.role}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={!!selectedJob} title={selectedJob?.role} subtitle={selectedJob?.type} onClose={() => setSelectedJob(null)}>
                {selectedJob && (
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Detail label="Location" value={selectedJob.location} />
                        <Detail label="CTC / Stipend" value={formatCtc(selectedJob.ctc)} />
                        <Detail label="Eligible batch" value={selectedJob.eligibleBatch} />
                        <Detail label="Minimum CGPA" value={selectedJob.minimumCgpa} />
                        <Detail label="Eligible branches" value={selectedJob.eligibleBranches?.join(', ').toUpperCase()} />
                        <Detail label="Application deadline" value={formatDate(selectedJob.lastDate)} />
                    </dl>
                )}
            </Modal>
            <ConfirmDialog
                isOpen={!!jobToDelete}
                title="Delete this drive?"
                message={`"${jobToDelete?.role}" and all its applications will be permanently deleted.`}
                confirmLabel="Delete drive"
                danger
                onConfirm={confirmDelete}
                onCancel={() => setJobToDelete(null)}
            />
        </>
    );
}
