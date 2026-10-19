import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import api, { formatDate } from '../../utility/api';
import { EmptyState, SectionCard, Spinner } from '../ui';

// Shows admin notices for the logged-in role ('student' or 'company')
const NoticeBoard = ({ role, className = '' }) => {
    const [notices, setNotices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get(`/${role}/notices`)
            .then((res) => setNotices(res.data?.data || []))
            .catch(() => setNotices([]))
            .finally(() => setIsLoading(false));
    }, [role]);

    return (
        <SectionCard title="Notices" description="Announcements from the placement cell" className={className}>
            {isLoading ? (
                <div className="flex justify-center py-6 text-slate-400"><Spinner /></div>
            ) : notices.length === 0 ? (
                <EmptyState icon={Megaphone} title="No notices right now" description="New announcements will show up here." />
            ) : (
                <ul className="-my-3 divide-y divide-slate-100">
                    {notices.map((notice) => (
                        <li key={notice._id} className="py-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h3 className="font-semibold text-slate-900">{notice.title}</h3>
                                <time className="text-xs text-slate-500" dateTime={notice.createdAt}>{formatDate(notice.createdAt)}</time>
                            </div>
                            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{notice.message}</p>
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
};

export default NoticeBoard;
