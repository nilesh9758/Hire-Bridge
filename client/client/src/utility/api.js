import axios from 'axios';

// Same-origin API: Vercel serves it under /api, and the Vite dev server proxies /api
// to the local Express server. Keeping one origin lets the auth cookies stay SameSite=Strict.
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Shared client for authenticated API calls (sends the auth cookies)
const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
    error?.response?.data?.message || fallback;

export const resumeUrl = {
    application: (applicationId) => `${API_BASE}/resume/application/${applicationId}`,
    student: (studentId) => `${API_BASE}/resume/student/${studentId}`,
};

// Human-readable labels for application statuses
export const STATUS_LABELS = {
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview Scheduled',
    interview_accepted: 'Interview Accepted',
    selected: 'Selected - Offer Pending',
    rejected: 'Rejected',
    offer_accepted: 'Offer Accepted',
    offer_declined: 'Offer Declined',
};

// Coarse stage used by the admin placement tracker
export const placementStage = (status) => {
    if (status === 'offer_accepted') return 'Placed';
    if (status === 'selected') return 'Selected';
    if (status === 'rejected') return 'Rejected';
    if (status === 'offer_declined') return 'Offer Declined';
    return 'In Progress';
};

export const formatCtc = (ctc) => {
    if (ctc === undefined || ctc === null || ctc === '') return '-';
    const value = Number(ctc);
    return value >= 100000 ? `${(value / 100000).toFixed(1)} LPA` : `₹${value.toLocaleString('en-IN')}`;
};

export const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-');

export const formatDateTime = (date) =>
    date ? new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export default api;
