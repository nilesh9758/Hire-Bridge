import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, LogIn, ShieldAlert } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { Alert, Avatar, Field, Spinner } from "../components/ui";
import { useAuth, HOME_BY_ROLE, ROLE_LABELS, isPathAllowedForRole } from "../utility/AuthContext";
import api from "../utility/api";

const REASON_MESSAGES = {
    auth: { tone: 'info', title: 'Please sign in to continue', text: 'You need to be signed in to open that page.' },
    expired: { tone: 'warning', title: 'Your session has ended', text: 'Please sign in again to continue.' },
    loggedout: { tone: 'success', title: 'You have been signed out', text: null },
};

const BLOCKED_MESSAGES = {
    ACCOUNT_DISABLED: "Your account has been disabled by the admin. You can ask the admin to enable it again.",
    ACCOUNT_PENDING: "Your profile isn't enabled yet. Please wait for the admin to approve your account.",
};

// Only same-app, absolute paths are accepted as a post-login destination
const safeFrom = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '');

export function Login() {
    const { status, user, role, login, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const reason = searchParams.get('reason');
    const from = safeFrom(searchParams.get('from'));

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [blockCode, setBlockCode] = useState(searchParams.get('blocked') || "");
    const [enableRequested, setEnableRequested] = useState(false);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestMessage, setRequestMessage] = useState("");
    const [requestStatus, setRequestStatus] = useState({ type: "", text: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // A signed-in user who was NOT sent here because of a forbidden/unknown URL goes straight to their portal
    const explainsRedirect = reason === 'denied' || reason === 'notfound';
    useEffect(() => {
        if (status === 'authenticated' && !explainsRedirect) {
            navigate(isPathAllowedForRole(from, role) ? from : HOME_BY_ROLE[role], { replace: true });
        }
    }, [status, role, from, explainsRedirect, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setBlockCode("");
        setShowRequestForm(false);
        setRequestStatus({ type: "", text: "" });
        setIsSubmitting(true);
        const result = await login(email, password);
        setIsSubmitting(false);
        if (result.success) {
            navigate(isPathAllowedForRole(from, result.role) ? from : HOME_BY_ROLE[result.role], { replace: true });
            return;
        }
        if (result.code === 'ACCOUNT_DISABLED' || result.code === 'ACCOUNT_PENDING') {
            setBlockCode(result.code);
            setEnableRequested(Boolean(result.enableRequested));
        } else {
            setError(result.message);
        }
    };

    const handleRequestEnable = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setRequestStatus({ type: "error", text: "Enter your email and password above so we can verify your account." });
            return;
        }
        try {
            const res = await api.post('/auth/request-enable', { email, password, message: requestMessage });
            setRequestStatus({ type: "success", text: res.data?.message || "Your request has been sent to the admin." });
            setEnableRequested(true);
            setShowRequestForm(false);
        } catch (err) {
            setRequestStatus({ type: "error", text: err.response?.data?.message || "Could not send the request. Please try again." });
        }
    };

    // Signed in, but the requested URL is not allowed for this account (or doesn't exist)
    if (status === 'authenticated' && explainsRedirect) {
        return (
            <AuthLayout
                title={reason === 'denied' ? "You don't have access to that page" : "Page not found"}
                subtitle={reason === 'denied'
                    ? "The page you tried to open belongs to a different type of account."
                    : "The address you opened doesn't exist."}
            >
                <div className="card card-body">
                    <div className="flex items-center gap-3">
                        <Avatar name={user?.name} size="h-11 w-11 text-base" />
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{user?.name}</p>
                            <p className="truncate text-sm text-slate-500">Signed in as {ROLE_LABELS[role]} · {user?.email}</p>
                        </div>
                    </div>
                    {from && (
                        <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                            <span>Requested: <code className="break-all font-mono text-xs">{from}</code></span>
                        </p>
                    )}
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                        <button onClick={() => navigate(HOME_BY_ROLE[role], { replace: true })} className="btn btn-primary flex-1">Go to my dashboard</button>
                        <button onClick={() => logout({ redirect: false })} className="btn btn-secondary flex-1">Sign in as someone else</button>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    const reasonMessage = REASON_MESSAGES[reason];

    return (
        <AuthLayout
            title="Welcome back"
            subtitle={<>Don&apos;t have an account? <Link to="/register" className="link">Create one</Link></>}
        >
            <div className="space-y-4">
                {status === 'loading' && <div className="flex justify-center text-slate-400"><Spinner /></div>}
                {reason === 'notfound' && status !== 'loading' && (
                    <Alert tone="info" title="Page not found">That page doesn&apos;t exist. Sign in to go to your dashboard.</Alert>
                )}
                {reasonMessage && !blockCode && <Alert tone={reasonMessage.tone} title={reasonMessage.title}>{reasonMessage.text}</Alert>}
                {searchParams.get('registered') && !blockCode && (
                    <Alert tone="success" title="Registration successful">
                        Your account is awaiting admin approval. You can sign in once the admin enables your profile.
                    </Alert>
                )}
                {blockCode === 'ACCOUNT_PENDING' && <Alert tone="warning" title="Profile not enabled yet">{BLOCKED_MESSAGES.ACCOUNT_PENDING}</Alert>}
                {blockCode === 'ACCOUNT_DISABLED' && (
                    <Alert tone="error" title="Account disabled">
                        <p>{BLOCKED_MESSAGES.ACCOUNT_DISABLED}</p>
                        {enableRequested && !showRequestForm && (
                            <p className="mt-2 font-medium text-emerald-700">Your request to enable this profile has been sent. The admin will review it.</p>
                        )}
                        {!showRequestForm && (
                            <button
                                type="button"
                                onClick={() => { setShowRequestForm(true); setRequestStatus({ type: "", text: "" }); }}
                                className="btn btn-secondary btn-sm mt-3"
                            >
                                {enableRequested ? 'Send another request' : 'Request admin to enable my profile'}
                            </button>
                        )}
                        {showRequestForm && (
                            <form onSubmit={handleRequestEnable} className="mt-3 space-y-2">
                                <label htmlFor="request-message" className="block text-xs font-medium">Message to the admin (optional)</label>
                                <textarea
                                    id="request-message"
                                    rows={3}
                                    maxLength={500}
                                    value={requestMessage}
                                    onChange={(e) => setRequestMessage(e.target.value)}
                                    className="input"
                                    placeholder="Why should your account be enabled?"
                                />
                                <div className="flex gap-2">
                                    <button type="submit" className="btn btn-primary btn-sm">Send request</button>
                                    <button type="button" onClick={() => setShowRequestForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
                                </div>
                            </form>
                        )}
                        {requestStatus.text && (
                            <p className={`mt-2 font-medium ${requestStatus.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{requestStatus.text}</p>
                        )}
                    </Alert>
                )}
                {error && <Alert tone="error">{error}</Alert>}
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-5" noValidate>
                <Field label="Email address" htmlFor="login-email">
                    <input
                        id="login-email"
                        className="input"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Field>
                <Field label="Password" htmlFor="login-password">
                    <div className="relative">
                        <input
                            id="login-password"
                            className="input pr-10"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </Field>
                <button type="submit" disabled={isSubmitting || !email || !password} className="btn btn-primary btn-lg w-full">
                    {isSubmitting ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
            </form>
        </AuthLayout>
    );
}

export default Login;
