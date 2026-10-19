import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, Star, CalendarCheck, Hourglass, BadgeCheck, PlusCircle, Building2, ArrowRight } from 'lucide-react';
import api from '../../utility/api';
import NoticeBoard from '../../components/common/NoticeBoard';
import { Alert, PageHeader, SectionCard, StatCard } from '../../components/ui';

function CDashboard() {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        api.get('/company/stats').then((res) => setStats(res.data.data)).catch(() => setStats({}));
        api.get('/company/profile').then((res) => setProfile(res.data.data)).catch(() => {});
    }, []);

    return (
        <>
            <PageHeader
                eyebrow="Recruiter dashboard"
                title={`Welcome, ${profile?.name || 'Recruiter'}`}
                description="Your hiring pipeline at a glance."
                actions={<Link to="/company/post-drive" className="btn btn-primary"><PlusCircle className="h-4 w-4" aria-hidden="true" /> Post a drive</Link>}
            />

            {profile && !profile.isProfileComplete && (
                <Alert tone="warning" title="Complete your company profile" className="mb-6">
                    Add your address, website and phone so students and the placement cell can reach you.{' '}
                    <Link to="/company/update-profile" className="font-semibold underline">Complete profile</Link>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Active drives" value={stats?.activeJobs} icon={Briefcase} to="/company/current-drives" />
                <StatCard label="Total applicants" value={stats?.totalApplications} icon={Users} tone="sky" to="/company/drive-application" />
                <StatCard label="Shortlisted" value={stats?.shortlisted} icon={Star} tone="violet" to="/company/drive-application" />
                <StatCard label="Interviews scheduled" value={stats?.interviews} icon={CalendarCheck} tone="amber" to="/company/drive-application" />
                <StatCard label="Offers awaiting response" value={stats?.selected} icon={Hourglass} tone="rose" to="/company/drive-application" />
                <StatCard label="Offers accepted" value={stats?.offersAccepted} icon={BadgeCheck} tone="green" to="/company/drive-application" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <SectionCard title="Quick actions" className="h-fit">
                    <div className="space-y-2">
                        {[
                            { to: '/company/post-drive', icon: PlusCircle, label: 'Post a new drive' },
                            { to: '/company/drive-application', icon: Users, label: 'Review applicants' },
                            { to: '/company/update-profile', icon: Building2, label: 'Update company profile' },
                        ].map(({ to, icon: Icon, label }) => (
                            <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50">
                                <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                                <span className="flex-1">{label}</span>
                                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                </SectionCard>
                <NoticeBoard role="company" className="lg:col-span-2" />
            </div>
        </>
    );
}

export default CDashboard;
