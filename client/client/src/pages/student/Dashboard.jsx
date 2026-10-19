import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, FileText, Star, CalendarCheck, Award, PartyPopper, ArrowRight, CalendarClock, CircleAlert } from 'lucide-react';
import { useAuth } from '../../utility/AuthContext';
import api, { formatDateTime } from '../../utility/api';
import NoticeBoard from '../../components/common/NoticeBoard';
import { Alert, EmptyState, PageHeader, SectionCard, StatCard } from '../../components/ui';

const INTERVIEW_STATUSES = ['interview_scheduled', 'interview_accepted'];
const SHORTLISTED_STATUSES = ['shortlisted', ...INTERVIEW_STATUSES, 'selected', 'offer_accepted', 'offer_declined'];

function Dashboard() {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        api.get('/student/jobs').then((res) => setJobs(res.data?.data || [])).catch(() => {});
        api.get('/student/applications').then((res) => setApplications(res.data?.data || [])).catch(() => {});
        api.get('/student/profile').then((res) => setProfile(res.data?.data || null)).catch(() => {});
    }, []);

    const count = (statuses) => applications.filter((a) => statuses.includes(a.status)).length;
    const eligibleOpen = jobs.filter((j) => j.eligibility?.eligible && !j.applicationStatus).length;
    const upcoming = applications
        .filter((a) => INTERVIEW_STATUSES.includes(a.status) && new Date(a.interview?.scheduledAt) >= new Date())
        .sort((a, b) => new Date(a.interview.scheduledAt) - new Date(b.interview.scheduledAt));
    const pendingOffers = applications.filter((a) => a.status === 'selected');
    const placedAt = applications.find((a) => a.status === 'offer_accepted');
    const firstName = user?.name?.split(' ')[0];

    const checklist = profile && [
        { done: profile.isProfileComplete, label: 'Complete your academic profile' },
        { done: Boolean(profile.resume?.fileName), label: 'Upload your resume (PDF)' },
    ];

    return (
        <>
            <PageHeader eyebrow="Student dashboard" title={`Hi ${firstName || 'there'} 👋`} description="Here's what's happening with your placements." />

            <div className="space-y-4">
                {placedAt && (
                    <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white shadow-card">
                        <PartyPopper className="h-8 w-8 shrink-0" aria-hidden="true" />
                        <div>
                            <p className="text-lg font-semibold">Congratulations, you&apos;re placed!</p>
                            <p className="text-emerald-50">{placedAt.role} at {placedAt.companyName}</p>
                        </div>
                    </div>
                )}
                {pendingOffers.length > 0 && (
                    <Alert tone="warning" title={`You have ${pendingOffers.length} offer(s) waiting for your response`}>
                        <Link to="/student/shortlisted-jobs" className="font-semibold underline">Review and respond</Link>
                    </Alert>
                )}
                {checklist && checklist.some((c) => !c.done) && (
                    <div className="card card-body flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
                            <div>
                                <p className="font-semibold text-slate-900">Finish setting up to start applying</p>
                                <ul className="mt-1 space-y-0.5 text-sm">
                                    {checklist.map((c) => (
                                        <li key={c.label} className={c.done ? 'text-emerald-600 line-through' : 'text-slate-600'}>{c.label}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <Link to="/student/edit-profile" className="btn btn-primary shrink-0">Complete profile <ArrowRight className="h-4 w-4" /></Link>
                    </div>
                )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Open to you" value={eligibleOpen} icon={Briefcase} to="/student/active-jobs" hint="Eligible drives" />
                <StatCard label="Applications" value={applications.length} icon={FileText} tone="sky" to="/student/applied-jobs" />
                <StatCard label="Shortlisted" value={count(SHORTLISTED_STATUSES)} icon={Star} tone="violet" to="/student/shortlisted-jobs" />
                <StatCard label="Interviews" value={applications.filter((a) => a.interview?.scheduledAt).length} icon={CalendarCheck} tone="amber" to="/student/shortlisted-jobs" />
                <StatCard label="Offers" value={count(['selected', 'offer_accepted', 'offer_declined'])} icon={Award} tone="green" to="/student/shortlisted-jobs" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SectionCard title="Upcoming interviews" description="Interviews you have been invited to">
                    {upcoming.length === 0 ? (
                        <EmptyState icon={CalendarClock} title="No upcoming interviews" description="When a recruiter schedules an interview it will appear here." />
                    ) : (
                        <ul className="-my-3 divide-y divide-slate-100">
                            {upcoming.map((a) => (
                                <li key={a.applicationId} className="flex items-center justify-between gap-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-900">{a.role}</p>
                                        <p className="truncate text-sm text-slate-500">{a.companyName} · {formatDateTime(a.interview.scheduledAt)} · <span className="capitalize">{a.interview.mode}</span></p>
                                    </div>
                                    {a.status === 'interview_scheduled'
                                        ? <Link to="/student/shortlisted-jobs" className="btn btn-primary btn-sm shrink-0">Accept</Link>
                                        : <span className="text-xs font-medium text-emerald-600">Accepted</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
                <NoticeBoard role="student" />
            </div>
        </>
    );
}

export default Dashboard;
