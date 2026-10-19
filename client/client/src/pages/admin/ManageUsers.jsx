import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, FileText, Users } from "lucide-react";
import api, { errorMessage, formatDate, resumeUrl } from "../../utility/api";
import StatusBadge from "../../components/common/StatusBadge";
import { ConfirmDialog } from "../../components/common/Modal";
import { useToast } from "../../components/common/Toast";
import { Avatar, EmptyState, PageHeader, PageLoader } from "../../components/ui";

const FILTERS = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending approval' },
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'requests', label: 'Enable requests' },
];

const COPY = {
    student: { title: 'Students', noun: 'student' },
    company: { title: 'Recruiters', noun: 'recruiter' },
};

// Approve / enable / disable student or recruiter accounts
export default function ManageUsers({ role }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') || '';
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pendingAction, setPendingAction] = useState(null);
    const { showToast, toastElement } = useToast();

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/users', { params: { role, status: status || undefined } });
            setUsers(res.data.data || []);
        } catch (err) {
            showToast(errorMessage(err, 'Failed to load accounts'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [role, status, showToast]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const updateStatus = async () => {
        const { user, status: newStatus } = pendingAction;
        setPendingAction(null);
        try {
            const res = await api.patch(`/admin/users/${role}/${user._id}/status`, { status: newStatus });
            showToast(`${user.name}: ${res.data.message}`, 'success');
            fetchUsers();
        } catch (err) {
            showToast(errorMessage(err), 'error');
        }
    };

    const visible = users.filter((u) => `${u.name} ${u.email} ${u.rollNo || ''}`.toLowerCase().includes(search.toLowerCase()));

    const actionFor = (user) => {
        if (user.accountStatus === 'pending') return { label: 'Approve', status: 'active', className: 'btn-success' };
        if (user.accountStatus === 'disabled') return { label: 'Enable', status: 'active', className: 'btn-success' };
        return { label: 'Disable', status: 'disabled', className: 'btn-danger-soft' };
    };

    return (
        <>
            {toastElement}
            <PageHeader
                title={COPY[role].title}
                description={`New ${COPY[role].noun}s need your approval before they can use the portal. Disabled accounts are signed out and blocked immediately.`}
            />

            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
                    {FILTERS.map((f) => (
                        <button key={f.value} role="tab" aria-selected={status === f.value} onClick={() => setSearchParams(f.value ? { status: f.value } : {})} className={`chip ${status === f.value ? 'chip-active' : ''}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="relative lg:ml-auto lg:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input type="search" aria-label="Search accounts" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
                </div>
            </div>

            <div className="card overflow-hidden">
                {isLoading ? (
                    <PageLoader />
                ) : visible.length === 0 ? (
                    <EmptyState icon={Users} title={`No ${COPY[role].noun} accounts here`} description="Try another filter." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{role === 'student' ? 'Student' : 'Company'}</th>
                                    {role === 'student' ? (<><th>Branch / Batch</th><th>CGPI</th><th>Placement</th><th>Resume</th></>) : (<><th>Website</th><th>Phone</th></>)}
                                    <th>Registered</th>
                                    <th>Status</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((user) => {
                                    const action = actionFor(user);
                                    return (
                                        <tr key={user._id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={user.name} size="h-8 w-8 text-xs" />
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-slate-900">{user.name}</p>
                                                        <p className="text-xs text-slate-500">{user.email}{user.rollNo ? ` · ${user.rollNo}` : ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {role === 'student' ? (
                                                <>
                                                    <td className="uppercase">{user.branch ? `${user.branch} / ${user.graduatingYear || '-'}` : <span className="normal-case text-slate-400">Profile incomplete</span>}</td>
                                                    <td>{user.cgpi ?? '–'}</td>
                                                    <td>{user.isPlaced ? <StatusBadge status="Placed" label={`Placed · ${user.placedCompany?.name || ''}`} /> : <span className="text-slate-400">Not placed</span>}</td>
                                                    <td>
                                                        {user.resume?.fileName
                                                            ? <a className="link inline-flex items-center gap-1" href={resumeUrl.student(user._id)} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" aria-hidden="true" /> PDF</a>
                                                            : <span className="text-slate-400">–</span>}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="max-w-[12rem] truncate">{user.website || '–'}</td>
                                                    <td>{user.phone || '–'}</td>
                                                </>
                                            )}
                                            <td className="whitespace-nowrap">{formatDate(user.createdAt)}</td>
                                            <td>
                                                <StatusBadge status={user.accountStatus || 'pending'} />
                                                {user.enableRequest?.requested && (
                                                    <div className="mt-2 max-w-xs rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                                                        <p className="font-semibold">Asked to be enabled · {formatDate(user.enableRequest.requestedAt)}</p>
                                                        {user.enableRequest.message && <p className="mt-0.5 italic">&ldquo;{user.enableRequest.message}&rdquo;</p>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button onClick={() => setPendingAction({ user, ...action })} className={`btn btn-sm ${action.className}`}>{action.label}</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!pendingAction}
                title={`${pendingAction?.label} ${pendingAction?.user.name}?`}
                message={pendingAction?.status === 'disabled'
                    ? 'They will be signed out immediately and blocked from the portal until you enable the account again.'
                    : 'They will be able to sign in and use the portal.'}
                confirmLabel={pendingAction?.label}
                danger={pendingAction?.status === 'disabled'}
                onConfirm={updateStatus}
                onCancel={() => setPendingAction(null)}
            />
        </>
    );
}
