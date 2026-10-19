import React, { useEffect, useMemo, useState } from "react";
import { Search, Trophy, Loader, Award, XCircle, Undo2, FileText } from "lucide-react";
import api, { errorMessage, formatCtc, formatDate, placementStage, STATUS_LABELS } from "../../utility/api";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/Toast";
import { Avatar, EmptyState, PageHeader, PageLoader, SectionCard, StatCard } from "../../components/ui";

const STAGES = ['All', 'In Progress', 'Selected', 'Placed', 'Rejected', 'Offer Declined'];
const STAGE_CARDS = [
    { label: 'In Progress', icon: Loader, tone: 'sky' },
    { label: 'Selected', icon: Award, tone: 'amber' },
    { label: 'Placed', icon: Trophy, tone: 'green' },
    { label: 'Rejected', icon: XCircle, tone: 'rose' },
    { label: 'Offer Declined', icon: Undo2, tone: 'slate' },
];

// Which student is at which stage with which company
export default function Placements() {
    const [data, setData] = useState({ applications: [], placedStudents: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [stage, setStage] = useState('All');
    const [search, setSearch] = useState('');
    const { showToast, toastElement } = useToast();

    useEffect(() => {
        api.get('/admin/placements')
            .then((res) => setData(res.data.data))
            .catch((err) => showToast(errorMessage(err, 'Failed to load placements'), 'error'))
            .finally(() => setIsLoading(false));
    }, [showToast]);

    const counts = useMemo(() => {
        const result = Object.fromEntries(STAGE_CARDS.map((s) => [s.label, 0]));
        data.applications.forEach((a) => { result[placementStage(a.status)] += 1; });
        return result;
    }, [data.applications]);

    const rows = data.applications.filter((a) =>
        (stage === 'All' || placementStage(a.status) === stage) &&
        `${a.student.name} ${a.student.rollNo || ''} ${a.company.name} ${a.job.role}`.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return <PageLoader />;

    return (
        <>
            {toastElement}
            <PageHeader title="Placements" description="Track where every student stands with each company." />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {STAGE_CARDS.map(({ label, icon, tone }) => (
                    <button key={label} onClick={() => setStage(label)} className="text-left" aria-pressed={stage === label}>
                        <StatCard label={label} value={counts[label]} icon={icon} tone={tone} highlight={stage === label} />
                    </button>
                ))}
            </div>

            <SectionCard title="Placed students" description="Students who accepted an offer" className="mt-6">
                {data.placedStudents.length === 0 ? (
                    <EmptyState icon={Trophy} title="No placements yet" description="Students appear here once they accept an offer." />
                ) : (
                    <div className="-mx-5 -my-5 overflow-x-auto sm:-mx-6 sm:-my-6">
                        <table className="table">
                            <thead><tr><th>Student</th><th>Roll no</th><th>Branch / Batch</th><th>Company</th><th>Role</th><th>CTC</th></tr></thead>
                            <tbody>
                                {data.placedStudents.map((s) => (
                                    <tr key={s._id}>
                                        <td><div className="flex items-center gap-3"><Avatar name={s.name} size="h-8 w-8 text-xs" /><div><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.email}</p></div></div></td>
                                        <td>{s.rollNo || '–'}</td>
                                        <td className="uppercase">{s.branch} / {s.graduatingYear}</td>
                                        <td className="font-semibold text-emerald-700">{s.placedCompany?.name || '–'}</td>
                                        <td>{s.placedJob?.role || '–'}</td>
                                        <td>{formatCtc(s.placedJob?.ctc)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>

            <div className="mt-8 mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <h2 className="text-lg font-semibold text-slate-900">All applications</h2>
                <div className="flex flex-wrap gap-2 lg:ml-4">
                    {STAGES.map((s) => (
                        <button key={s} onClick={() => setStage(s)} className={`chip ${stage === s ? 'chip-active' : ''}`} aria-pressed={stage === s}>{s}</button>
                    ))}
                </div>
                <div className="relative lg:ml-auto lg:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input type="search" aria-label="Search applications" placeholder="Student, company or role" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
                </div>
            </div>
            <div className="card overflow-hidden">
                {rows.length === 0 ? (
                    <EmptyState icon={FileText} title="No applications in this view" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead><tr><th>Student</th><th>Company</th><th>Role</th><th>Stage</th><th>Detailed status</th><th>Last update</th></tr></thead>
                            <tbody>
                                {rows.map((a) => (
                                    <tr key={a._id}>
                                        <td><p className="font-medium text-slate-900">{a.student.name}</p><p className="text-xs text-slate-500">{a.student.rollNo || a.student.email}</p></td>
                                        <td className="font-medium">{a.company.name}</td>
                                        <td>{a.job.role}</td>
                                        <td><StatusBadge status={placementStage(a.status)} label={placementStage(a.status)} /></td>
                                        <td className="text-slate-500">{STATUS_LABELS[a.status]}</td>
                                        <td className="whitespace-nowrap text-slate-500">{formatDate(a.updatedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
