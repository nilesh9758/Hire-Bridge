import React, { useEffect, useRef, useState } from 'react';
import { FileText, UploadCloud, Save } from 'lucide-react';
import api, { errorMessage, resumeUrl, formatDate } from '../../utility/api';
import { Alert, Field, PageHeader, PageLoader, SectionCard, Spinner } from '../../components/ui';

const EMPTY = {
    name: '', email: '', phone: '', gender: '', degree: '', branch: '', rollNo: '',
    cgpi: '', tenthMarks: '', twelfthMarks: '', graduatingYear: '',
};

// Upload / replace the PDF resume that recruiters see with each application
const ResumeSection = ({ studentId, resume, onUploaded }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState({ tone: '', text: '' });
    const inputRef = useRef(null);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setStatus({ tone: 'error', text: 'Please choose a PDF file.' });
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            setStatus({ tone: 'error', text: 'The file is larger than 4 MB.' });
            return;
        }
        const formData = new FormData();
        formData.append('resume', file);
        setIsUploading(true);
        try {
            const res = await api.post('/student/resume', formData);
            setStatus({ tone: 'success', text: res.data?.message || 'Resume uploaded' });
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
            onUploaded(res.data?.data);
        } catch (err) {
            setStatus({ tone: 'error', text: errorMessage(err, 'Upload failed') });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <SectionCard title="Resume" description="PDF, up to 4 MB. Recruiters see the resume you had when you applied.">
            {resume?.fileName ? (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose-50 text-rose-600"><FileText className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{resume.originalName || 'resume.pdf'}</p>
                        <p className="text-xs text-slate-500">Uploaded {formatDate(resume.uploadedAt)}</p>
                    </div>
                    <a href={resumeUrl.student(studentId)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">View</a>
                </div>
            ) : (
                <Alert tone="warning" className="mb-4">No resume uploaded yet. You need one to apply.</Alert>
            )}
            <form onSubmit={handleUpload}>
                <label htmlFor="resume-file" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
                    <UploadCloud className="h-7 w-7 text-slate-400" aria-hidden="true" />
                    <span className="mt-2 text-sm font-medium text-slate-700">{file ? file.name : 'Choose a PDF file'}</span>
                    <span className="text-xs text-slate-500">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'Click to browse'}</span>
                    <input
                        id="resume-file"
                        ref={inputRef}
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        onChange={(e) => { setFile(e.target.files?.[0] || null); setStatus({ tone: '', text: '' }); }}
                    />
                </label>
                {status.text && <Alert tone={status.tone} className="mt-3">{status.text}</Alert>}
                <button type="submit" disabled={!file || isUploading} className="btn btn-primary mt-4 w-full">
                    {isUploading ? <Spinner className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}
                    {isUploading ? 'Uploading...' : resume?.fileName ? 'Replace resume' : 'Upload resume'}
                </button>
            </form>
        </SectionCard>
    );
};

const EditProfile = () => {
    const [student, setStudent] = useState(EMPTY);
    const [studentId, setStudentId] = useState('');
    const [resume, setResume] = useState(null);
    const [isComplete, setIsComplete] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ tone: '', text: '' });

    useEffect(() => {
        api.get('/student/profile')
            .then((res) => {
                const p = res.data?.data || {};
                setStudent(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? ''])));
                setStudentId(p._id);
                setResume(p.resume || null);
                setIsComplete(Boolean(p.isProfileComplete));
            })
            .catch((err) => setSaveStatus({ tone: 'error', text: errorMessage(err, 'Failed to load your profile') }))
            .finally(() => setIsFetching(false));
    }, []);

    const update = (e) => setStudent({ ...student, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveStatus({ tone: '', text: '' });
        try {
            await api.put('/student/complete-profile', student);
            setSaveStatus({ tone: 'success', text: 'Profile updated successfully!' });
            setIsComplete(true);
        } catch (err) {
            setSaveStatus({ tone: 'error', text: errorMessage(err, 'Failed to update profile') });
        } finally {
            setIsSaving(false);
        }
    };

    if (isFetching) return <PageLoader label="Loading profile..." />;

    const input = (name, props = {}) => (
        <input id={`p-${name}`} name={name} value={student[name]} onChange={update} className="input" {...props} />
    );

    return (
        <>
            <PageHeader
                title="Profile & resume"
                description="Recruiters see these details. Eligibility for drives is based on your branch, batch and CGPI."
                actions={isComplete
                    ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Profile complete</span>
                    : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">Profile incomplete</span>}
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
                    <SectionCard title="Personal details">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Full name" htmlFor="p-name">{input('name', { required: true, autoComplete: 'name' })}</Field>
                            <Field label="Email" htmlFor="p-email" hint="Contact the admin to change your email.">{input('email', { disabled: true })}</Field>
                            <Field label="Phone" htmlFor="p-phone">{input('phone', { required: true, type: 'tel', autoComplete: 'tel' })}</Field>
                            <Field label="Gender" htmlFor="p-gender">
                                <select id="p-gender" name="gender" value={student.gender} onChange={update} className="input">
                                    <option value="">Prefer not to say</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </Field>
                        </div>
                    </SectionCard>
                    <SectionCard title="Academic details">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Degree" htmlFor="p-degree">
                                <select id="p-degree" name="degree" value={student.degree} onChange={update} className="input" required>
                                    <option value="">Select degree</option>
                                    <option value="btech">B.Tech</option>
                                    <option value="mtech">M.Tech</option>
                                    <option value="mba">MBA</option>
                                </select>
                            </Field>
                            <Field label="Branch" htmlFor="p-branch" hint="e.g. IT, ECE, IT-BI">{input('branch', { required: true })}</Field>
                            <Field label="Roll number" htmlFor="p-rollNo">{input('rollNo', { required: true })}</Field>
                            <Field label="Graduating year" htmlFor="p-graduatingYear">{input('graduatingYear', { required: true, type: 'number', min: 2000, max: 2100, placeholder: '2027' })}</Field>
                            <Field label="CGPI" htmlFor="p-cgpi">{input('cgpi', { required: true, type: 'number', step: '0.01', min: 0, max: 10, placeholder: '8.5' })}</Field>
                            <Field label="10th marks (%)" htmlFor="p-tenthMarks">{input('tenthMarks', { required: true, type: 'number', step: '0.01', min: 0, max: 100 })}</Field>
                            <Field label="12th marks (%)" htmlFor="p-twelfthMarks">{input('twelfthMarks', { required: true, type: 'number', step: '0.01', min: 0, max: 100 })}</Field>
                        </div>
                    </SectionCard>
                    {saveStatus.text && <Alert tone={saveStatus.tone}>{saveStatus.text}</Alert>}
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSaving} className="btn btn-primary">
                            {isSaving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                            {isSaving ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                </form>
                <div className="lg:col-span-1">
                    <ResumeSection studentId={studentId} resume={resume} onUploaded={setResume} />
                </div>
            </div>
        </>
    );
};

export default EditProfile;
