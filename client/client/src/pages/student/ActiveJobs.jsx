import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, CalendarDays, IndianRupee, Briefcase, Ban, CheckCircle2 } from 'lucide-react';
import api, { errorMessage, formatCtc, formatDate } from '../../utility/api';
import StatusBadge from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { Alert, EmptyState, PageHeader, PageLoader } from '../../components/ui';

const FILTERS = [
    { value: 'all', label: 'All openings' },
    { value: 'eligible', label: 'Eligible for me' },
    { value: 'applied', label: 'Applied' },
];

const JobCard = ({ job, onApply }) => {
    const { eligibility, applicationStatus } = job;
    return (
        <article className="card flex flex-col p-5 transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-600">{job.company?.name || 'Company'}</p>
                    <h3 className="mt-0.5 text-lg font-semibold text-slate-900">{job.role}</h3>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">{job.type}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-1.5"><IndianRupee className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">CTC</dt><dd>{formatCtc(job.ctc)}</dd></div>
                <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Location</dt><dd className="truncate">{job.location}</dd></div>
                <div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Deadline</dt><dd>Apply by {formatDate(job.lastDate)}</dd></div>
                <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Eligibility</dt><dd className="truncate">{job.eligibleBatch} · CGPA {job.minimumCgpa}+</dd></div>
            </dl>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Branches: {job.eligibleBranches?.join(', ')}</p>

            <div className="mt-5 border-t border-slate-100 pt-4">
                {applicationStatus ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" /> You applied · <StatusBadge status={applicationStatus} />
                    </div>
                ) : eligibility?.eligible ? (
                    <button onClick={() => onApply(job)} className="btn btn-primary w-full">Apply now</button>
                ) : (
                    <div>
                        <button disabled className="btn btn-secondary w-full"><Ban className="h-4 w-4" aria-hidden="true" /> Not eligible</button>
                        <ul className="mt-2 space-y-0.5 text-xs text-rose-600">
                            {(eligibility?.reasons || []).map((reason) => <li key={reason}>• {reason}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </article>
    );
};

const ActiveJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('');
    const [jobToApply, setJobToApply] = useState(null);
    const { showToast, toastElement } = useToast();

    const fetchJobs = useCallback(async () => {
        try {
            const [jobsRes, profileRes] = await Promise.all([api.get('/student/jobs'), api.get('/student/profile')]);
            setJobs(jobsRes.data?.data || []);
            setProfile(profileRes.data?.data || null);
        } catch (error) {
            showToast(errorMessage(error, 'Failed to load jobs'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const apply = async () => {
        const job = jobToApply;
        setJobToApply(null);
        try {
            const res = await api.post(`/student/apply-job/${job._id}`);
            showToast(res.data?.message || 'Application submitted', 'success');
            fetchJobs();
        } catch (error) {
            showToast(errorMessage(error, 'Application failed'), 'error');
        }
    };

    const visible = useMemo(() => jobs.filter((job) =>
        `${job.company?.name} ${job.role} ${job.location}`.toLowerCase().includes(search.toLowerCase()) &&
        (filter === 'all' || (filter === 'eligible' ? job.eligibility?.eligible && !job.applicationStatus : Boolean(job.applicationStatus))) &&
        (!typeFilter || job.type === typeFilter)
    ), [jobs, search, filter, typeFilter]);

    return (
        <>
            {toastElement}
            <PageHeader title="Job openings" description="Every open drive on campus. You can apply to the ones you're eligible for." />

            <div className="mb-5 space-y-3">
                {profile && !profile.isProfileComplete && (
                    <Alert tone="warning" title="Complete your profile to become eligible">
                        <Link to="/student/edit-profile" className="font-semibold underline">Complete profile</Link>
                    </Alert>
                )}
                {profile && !profile.resume?.fileName && (
                    <Alert tone="warning" title="Upload your resume before applying">
                        Recruiters see it with your application. <Link to="/student/edit-profile" className="font-semibold underline">Upload resume</Link>
                    </Alert>
                )}
            </div>

            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input type="search" aria-label="Search jobs" placeholder="Search by company, role or location" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {FILTERS.map((f) => (
                        <button key={f.value} onClick={() => setFilter(f.value)} className={`chip ${filter === f.value ? 'chip-active' : ''}`} aria-pressed={filter === f.value}>{f.label}</button>
                    ))}
                    <select aria-label="Job type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-auto">
                        <option value="">All types</option>
                        <option value="full-time">Full-time</option>
                        <option value="internship">Internship</option>
                        <option value="part-time">Part-time</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <PageLoader label="Loading openings..." />
            ) : visible.length === 0 ? (
                <div className="card"><EmptyState icon={Briefcase} title="No openings match" description="Try a different search or filter." /></div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((job) => <JobCard key={job._id} job={job} onApply={setJobToApply} />)}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!jobToApply}
                title={`Apply to ${jobToApply?.role}?`}
                message={`Your profile and current resume will be shared with ${jobToApply?.company?.name}.`}
                confirmLabel="Submit application"
                onConfirm={apply}
                onCancel={() => setJobToApply(null)}
            />
        </>
    );
};

export default ActiveJobs;
