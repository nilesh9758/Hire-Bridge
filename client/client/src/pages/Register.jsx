import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Building2, Check, Eye, EyeOff, GraduationCap, UserPlus } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import { Alert, Field, Spinner } from '../components/ui';
import api, { errorMessage } from '../utility/api';
import { useAuth, HOME_BY_ROLE } from '../utility/AuthContext';

const ROLES = [
    { value: 'student', label: 'Student', description: 'Apply to campus drives', icon: GraduationCap },
    { value: 'company', label: 'Recruiter', description: 'Hire from campus', icon: Building2 },
];

const PASSWORD_RULES = [
    { test: (p) => p.length >= 8, label: 'At least 8 characters' },
    { test: (p) => /[A-Za-z]/.test(p), label: 'Contains a letter' },
    { test: (p) => /\d/.test(p), label: 'Contains a number' },
];

export function Register() {
    const { status, role: currentRole } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (status === 'authenticated') {
        return <Navigate to={HOME_BY_ROLE[currentRole]} replace />;
    }

    const passwordOk = PASSWORD_RULES.every((rule) => rule.test(form.password));
    const canSubmit = form.name.trim() && form.email.trim() && passwordOk && form.role && !isSubmitting;

    const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.role) {
            setError('Please choose whether you are a student or a recruiter.');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post('/auth/register', form);
            navigate('/login?registered=1', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Registration failed. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Create your account"
            subtitle={<>Already have an account? <Link to="/login" className="link">Sign in</Link></>}
        >
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <fieldset>
                    <legend className="label">I am a</legend>
                    <div className="grid grid-cols-2 gap-3">
                        {ROLES.map(({ value, label, description, icon: Icon }) => {
                            const selected = form.role === value;
                            return (
                                <label
                                    key={value}
                                    className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition ${
                                        selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <input type="radio" name="role" value={value} checked={selected} onChange={update('role')} className="sr-only" />
                                    <Icon className={`h-5 w-5 ${selected ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden="true" />
                                    <span className="text-sm font-semibold text-slate-900">{label}</span>
                                    <span className="text-xs text-slate-500">{description}</span>
                                    {selected && <Check className="absolute right-3 top-3 h-4 w-4 text-brand-600" aria-hidden="true" />}
                                </label>
                            );
                        })}
                    </div>
                </fieldset>

                <Field label={form.role === 'company' ? 'Company name' : 'Full name'} htmlFor="reg-name">
                    <input id="reg-name" className="input" autoComplete="name" value={form.name} onChange={update('name')} required maxLength={100} />
                </Field>
                <Field label="Email address" htmlFor="reg-email">
                    <input id="reg-email" type="email" className="input" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
                </Field>
                <Field label="Password" htmlFor="reg-password">
                    <div className="relative">
                        <input
                            id="reg-password"
                            type={showPassword ? 'text' : 'password'}
                            className="input pr-10"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={update('password')}
                            required
                        />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {PASSWORD_RULES.map((rule) => {
                            const ok = rule.test(form.password);
                            return (
                                <li key={rule.label} className={`flex items-center gap-1 text-xs ${ok ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    <Check className={`h-3.5 w-3.5 ${ok ? 'opacity-100' : 'opacity-30'}`} aria-hidden="true" />
                                    {rule.label}
                                </li>
                            );
                        })}
                    </ul>
                </Field>

                {error && <Alert tone="error">{error}</Alert>}

                <button type="submit" disabled={!canSubmit} className="btn btn-primary btn-lg w-full">
                    {isSubmitting ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
                    {isSubmitting ? 'Creating account...' : 'Create account'}
                </button>
                <p className="text-center text-xs text-slate-500">New accounts are reviewed by the placement cell before they can sign in.</p>
            </form>
        </AuthLayout>
    );
}

export default Register;
