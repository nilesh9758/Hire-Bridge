import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '../ui';

const POINTS = [
    'One portal for students, recruiters and the placement cell',
    'Apply only to drives you are eligible for',
    'Interviews, offers and placement status in one place',
];

// Split-screen layout for the login and registration pages
export default function AuthLayout({ title, subtitle, children }) {
    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            <aside className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
                <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-teal-500/30 blur-3xl" />
                <Link to="/" className="relative"><Logo dark /></Link>
                <div className="relative">
                    <h2 className="text-4xl font-bold leading-tight tracking-tight text-white">
                        Your campus placements,<br />organised end to end.
                    </h2>
                    <ul className="mt-8 space-y-4">
                        {POINTS.map((point) => (
                            <li key={point} className="flex items-start gap-3 text-slate-300">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden="true" />
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="relative text-sm text-slate-500">© {new Date().getFullYear()} HireBridge</p>
            </aside>

            <main className="flex flex-col justify-center bg-white px-4 py-10 sm:px-8">
                <div className="mx-auto w-full max-w-md">
                    <Link to="/" className="mb-10 inline-block lg:hidden"><Logo /></Link>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
                    {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
                    <div className="mt-8">{children}</div>
                </div>
            </main>
        </div>
    );
}
