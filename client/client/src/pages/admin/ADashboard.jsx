import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserCheck, RefreshCcw, GraduationCap, Building2, Briefcase, FileText, Trophy, Megaphone, ArrowRight } from "lucide-react";
import { useAuth } from '../../utility/AuthContext';
import api, { errorMessage } from '../../utility/api';
import { Alert, PageHeader, StatCard } from '../../components/ui';

function ADashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/admin/stats')
            .then((res) => setStats(res.data.data))
            .catch((err) => setError(errorMessage(err, 'Failed to load stats')));
    }, []);

    const actions = stats ? [
        stats.pendingStudents > 0 && { to: '/admin/students?status=pending', text: `${stats.pendingStudents} student account(s) awaiting approval` },
        stats.pendingCompanies > 0 && { to: '/admin/companies?status=pending', text: `${stats.pendingCompanies} recruiter account(s) awaiting approval` },
        stats.enableRequests > 0 && { to: '/admin/students?status=requests', text: `${stats.enableRequests} disabled account(s) asked to be enabled` },
    ].filter(Boolean) : [];

    return (
        <>
            <PageHeader eyebrow="Placement cell" title={`Welcome, ${user?.name || 'Admin'}`} description="Overview of accounts, drives and placements." />
            {error && <Alert tone="error" className="mb-6">{error}</Alert>}

            {actions.length > 0 && (
                <div className="card mb-6 overflow-hidden">
                    <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">Needs your attention</div>
                    <ul className="divide-y divide-slate-100">
                        {actions.map((a) => (
                            <li key={a.to}>
                                <Link to={a.to} className="group flex items-center justify-between px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    {a.text}
                                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Pending approvals" value={stats?.pendingApprovals} icon={UserCheck} tone="amber" to="/admin/students?status=pending" highlight={stats?.pendingApprovals > 0} />
                <StatCard label="Enable requests" value={stats?.enableRequests} icon={RefreshCcw} tone="rose" to="/admin/students?status=requests" highlight={stats?.enableRequests > 0} />
                <StatCard label="Students" value={stats?.students} icon={GraduationCap} to="/admin/students" />
                <StatCard label="Recruiters" value={stats?.companies} icon={Building2} tone="sky" to="/admin/companies" />
                <StatCard label="Active job postings" value={stats?.activeJobs} icon={Briefcase} tone="violet" to="/admin/active-drives" />
                <StatCard label="Applications" value={stats?.applications} icon={FileText} tone="slate" to="/admin/placements" />
                <StatCard label="Students placed" value={stats?.placed} icon={Trophy} tone="green" to="/admin/placements" />
                <StatCard label="Notices posted" value={stats?.notices} icon={Megaphone} tone="brand" to="/admin/notices" />
            </div>
        </>
    );
}

export default ADashboard;
