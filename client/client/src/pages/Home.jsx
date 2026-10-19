import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight, GraduationCap, Building2, ShieldCheck, CalendarCheck, FileCheck2, Megaphone, BadgeCheck, LayoutDashboard,
} from 'lucide-react';
import { Logo } from '../components/ui';
import { useAuth, HOME_BY_ROLE } from '../utility/AuthContext';

const AUDIENCES = [
    {
        icon: GraduationCap,
        title: 'Students',
        points: ['Build your profile and upload your resume', 'See every drive and whether you are eligible', 'Accept interviews and respond to offers'],
    },
    {
        icon: Building2,
        title: 'Recruiters',
        points: ['Post openings with eligibility rules', 'Review applicants and their resumes', 'Schedule interviews and send offers by email'],
    },
    {
        icon: ShieldCheck,
        title: 'Placement cell',
        points: ['Approve and manage every account', 'Moderate job postings', 'Track who is placed where and post notices'],
    },
];

const STEPS = [
    { icon: BadgeCheck, title: 'Get approved', text: 'Sign up and the placement cell enables your account.' },
    { icon: FileCheck2, title: 'Apply', text: 'Students apply to drives they qualify for with one click.' },
    { icon: CalendarCheck, title: 'Interview', text: 'Recruiters shortlist and schedule interviews with email invites.' },
    { icon: Megaphone, title: 'Get placed', text: 'Offers are accepted on the portal and tracked by the admin.' },
];

function Home() {
    const { status, role } = useAuth();
    const signedIn = status === 'authenticated';

    return (
        <div className="min-h-screen bg-white">
            <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link to="/"><Logo /></Link>
                    <nav className="flex items-center gap-2">
                        {signedIn ? (
                            <Link to={HOME_BY_ROLE[role]} className="btn btn-primary">
                                <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Go to dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="btn btn-ghost">Sign in</Link>
                                <Link to="/register" className="btn btn-primary">Get started</Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main>
                <section className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center">
                        <div className="h-[36rem] w-[72rem] rounded-full bg-gradient-to-tr from-brand-200 via-teal-100 to-sky-100 opacity-70 blur-3xl" />
                    </div>
                    <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                                Campus placements, simplified
                            </span>
                            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                                Kickstart your career from <span className="bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent">campus</span>
                            </h1>
                            <p className="mt-5 max-w-xl text-lg text-slate-600">
                                HireBridge connects students, recruiters and the placement cell: from job postings and
                                eligibility checks to interviews, offers and placement tracking.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                {signedIn ? (
                                    <Link to={HOME_BY_ROLE[role]} className="btn btn-primary btn-lg">Open my dashboard <ArrowRight className="h-4 w-4" /></Link>
                                ) : (
                                    <>
                                        <Link to="/register" className="btn btn-primary btn-lg">Create an account <ArrowRight className="h-4 w-4" /></Link>
                                        <Link to="/login" className="btn btn-secondary btn-lg">Sign in</Link>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <img src="/hero.svg" alt="" className="w-full max-w-md drop-shadow-xl" />
                        </div>
                    </div>
                </section>

                <section className="border-t border-slate-100 bg-slate-50 py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Built for everyone in the placement process</h2>
                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            {AUDIENCES.map(({ icon: Icon, title, points }) => (
                                <div key={title} className="card card-body">
                                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                        {points.map((p) => <li key={p} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />{p}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">How it works</h2>
                        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {STEPS.map(({ icon: Icon, title, text }, i) => (
                                <li key={title} className="text-center">
                                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white">
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-600">Step {i + 1}</p>
                                    <h3 className="mt-1 font-semibold text-slate-900">{title}</h3>
                                    <p className="mt-1 text-sm text-slate-600">{text}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-100">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
                    <Logo />
                    <p>© {new Date().getFullYear()} HireBridge. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

export default Home;
