import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Briefcase, FileText, CalendarCheck, UserRound, Settings, PlusCircle, Users,
    Building2, GraduationCap, Trophy, Megaphone, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth, ROLE_LABELS, HOME_BY_ROLE } from '../../utility/AuthContext';
import { Avatar, Logo } from '../ui';

export const NAV_BY_ROLE = {
    student: [
        { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/student/active-jobs', label: 'Job Openings', icon: Briefcase },
        { to: '/student/applied-jobs', label: 'My Applications', icon: FileText },
        { to: '/student/shortlisted-jobs', label: 'Interviews & Offers', icon: CalendarCheck },
        { to: '/student/edit-profile', label: 'Profile & Resume', icon: UserRound },
        { to: '/student/settings', label: 'Settings', icon: Settings },
    ],
    company: [
        { to: '/company', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/company/post-drive', label: 'Post a Drive', icon: PlusCircle },
        { to: '/company/current-drives', label: 'My Drives', icon: Briefcase },
        { to: '/company/drive-application', label: 'Applications', icon: Users },
        { to: '/company/update-profile', label: 'Company Profile', icon: Building2 },
        { to: '/company/settings', label: 'Settings', icon: Settings },
    ],
    admin: [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/admin/students', label: 'Students', icon: GraduationCap },
        { to: '/admin/companies', label: 'Recruiters', icon: Building2 },
        { to: '/admin/active-drives', label: 'Job Postings', icon: Briefcase },
        { to: '/admin/placements', label: 'Placements', icon: Trophy },
        { to: '/admin/notices', label: 'Notices', icon: Megaphone },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
};

const SidebarContent = ({ role, user, onNavigate, onLogout }) => (
    <div className="flex h-full flex-col">
        <div className="flex h-16 items-center px-5">
            <Link to={HOME_BY_ROLE[role]} onClick={onNavigate} aria-label="Go to dashboard"><Logo /></Link>
        </div>
        <p className="px-5 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{ROLE_LABELS[role]} portal</p>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main navigation">
            {NAV_BY_ROLE[role].map(({ to, label, icon: Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} aria-hidden="true" />
                            {label}
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 rounded-xl p-2">
                <Avatar name={user?.name} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <button onClick={onLogout} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Sign out" aria-label="Sign out">
                    <LogOut className="h-4 w-4" />
                </button>
            </div>
        </div>
    </div>
);

export default function AppShell() {
    const { user, role, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const location = useLocation();

    useEffect(() => { setOpen(false); }, [location.pathname]);

    const handleLogout = () => logout();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
                <SidebarContent role={role} user={user} onLogout={handleLogout} />
            </aside>

            {/* Mobile top bar */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
                <Link to={HOME_BY_ROLE[role]}><Logo /></Link>
                <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Open menu" aria-expanded={open}>
                    <Menu className="h-5 w-5" />
                </button>
            </header>

            {/* Mobile drawer */}
            {open && (
                <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-fade-in bg-white shadow-xl">
                        <button onClick={() => setOpen(false)} className="absolute right-3 top-3.5 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
                            <X className="h-5 w-5" />
                        </button>
                        <SidebarContent role={role} user={user} onNavigate={() => setOpen(false)} onLogout={handleLogout} />
                    </aside>
                </div>
            )}

            <main className="lg:pl-64">
                <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
