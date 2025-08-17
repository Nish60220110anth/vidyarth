import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { GoogleLogin, googleLogout, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { baseUrl } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

interface GooglePayload {
    email: string;
    name: string;
    picture?: string;
}

export default function LoginPage({
    ip,
    IIMLPrivate,
    userAgent,
    language,
}: {
    ip?: string;
    IIMLPrivate?: boolean;
    userAgent?: string;
    language?: string;
}) {
    const { status, refresh, user } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    const passwordInputRef = useRef<HTMLInputElement | null>(null);

    const isValidEmail = (val: string) => /\S+@\S+\.\S+/.test(val);
    const goTo = (path: string) => router.push(`${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`);
    const fetchJson = async (url: string, init?: RequestInit) => {
        const res = await fetch(url, init);
        let data: any = {};
        try {
            data = await res.json();
        } catch { }
        return { res, data } as const;
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const hasCaps = (e as any).getModifierState && (e as any).getModifierState('CapsLock');
            setCapsLock(Boolean(hasCaps));
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
        };
    }, []);

    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        update();
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(`${baseUrl}/dashboard/`);
        }
    }, [status, router]);

    if (status === 'loading' || status === 'idle') return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOnline) {
            toast.error('You are offline. Please reconnect and try again.');
            return;
        }
        if (!isValidEmail(email)) {
            toast.error('Please enter a valid email.');
            return;
        }
        if (!password) {
            toast.error('Please enter your password.');
            return;
        }
        setIsLoggingIn(true);
        try {
            const { res, data } = await fetchJson(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok || !data?.success) {
                toast.error(data?.error || 'Login failed. Try again.');
                return;
            }
            await refresh();
            toast.success(`Welcome, ${email}${data.role ? ` (${data.role})` : ''}`);
            if (String(data.role || '').toLowerCase() === 'admin') {
                goTo('/admin/');
            } else {
                goTo('/dashboard/');
            }
        } catch {
            toast.error('Network error. Please try again later.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
        if (!isOnline) {
            toast.error('You are offline. Please reconnect and try again.');
            return;
        }
        if (!credentialResponse.credential) {
            toast.error('Google login failed.');
            return;
        }
        setIsLoggingIn(true);
        try {
            const decoded = jwtDecode<GooglePayload>(credentialResponse.credential);

            if (!decoded.email || !decoded.name) {
                toast.error('Invalid Google response. Please try again.');
                return;
            }

            const { data } = await fetchJson(`${baseUrl}/api/auth/google-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-permission': 'ENABLE_PROFILE',
                },
                body: JSON.stringify({ email: decoded.email, name: decoded.name }),
            });

            googleLogout();
            const user = data.user;

            if(data.success) {
                await refresh();
                toast.success(`Welcome, ${user.name || user.email}`);
                if (String(user.role || '').toLowerCase() === 'admin') {
                    goTo('/admin/');
                } else {
                    goTo('/dashboard/');
                }
                return;
            }

            if (user.is_active && !user.is_verified) {
                toast.error('Your account is pending approval. Please wait for admin verification.');
                goTo('/requires-approval');
                return;
            }

            toast.error('Your account is inactive. Please contact support.');
            goTo('/');
        } catch {
            toast.error('Failed to authenticate using Google');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleForgotPassword = () => goTo('/forgot-password');
    const handleNewUser = () => goTo('/new-user');

    return (
        <>
            <Head>
                <title>Login • Charon</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#0a141d" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
            </Head>

            <div
                className={`fixed top-3 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full text-xs font-medium transition
        ${isOnline ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/50' : 'bg-amber-900/40 text-amber-200 border border-amber-700/50'}`}
                aria-live="polite"
            >
                {isOnline ? 'Online' : 'Offline — some actions are disabled'}
            </div>

            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0b1520] via-[#0a141d] to-[#0b1520] text-cyan-100 relative overflow-hidden font-[Inter]">
                <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full blur-3xl opacity-25 bg-cyan-700/20" />
                <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full blur-3xl opacity-25 bg-cyan-500/20" />

                {isLoggingIn && (
                    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                        <div className="h-16 w-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,255,255,0.6)] mb-4" />
                        <p className="text-cyan-200 text-lg font-medium animate-pulse">Logging you in…</p>
                    </div>
                )}

                <div className="w-full max-w-md p-[1px] rounded-2xl bg-gradient-to-b from-cyan-600/40 to-cyan-800/20 shadow-[0_0_32px_rgba(0,255,255,0.07)] z-10">
                    <div className="rounded-2xl bg-[#0b1014]/90 border border-cyan-900/60 p-8">
                        <h1 className="text-4xl font-extrabold text-center text-cyan-300 mb-2 tracking-wide">Welcome to Charon</h1>
                        <p className="text-center text-cyan-200/80 text-sm mb-8">Sign in to continue to your dashboard</p>

                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-cyan-200 mb-1">
                                    Email ID
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center text-cyan-400/70">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" strokeWidth="1.6" d="M3 7.5l8.3 5.2c.45.28.95.28 1.4 0L21 7.5M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" /></svg>
                                    </span>
                                    <input
                                        type="email"
                                        id="email"
                                        autoComplete="username"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0f1318] text-cyan-100 placeholder-cyan-400/70 border border-cyan-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
                                        placeholder="you@iiml.ac.in"
                                        required
                                        aria-invalid={!email ? undefined : !isValidEmail(email) || undefined}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="block text-sm font-medium text-cyan-200 mb-1">
                                        Password
                                    </label>
                                    {capsLock && <span className="text-amber-300 text-xs">CapsLock is ON</span>}
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center text-cyan-400/70">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" strokeWidth="1.6" d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" /></svg>
                                    </span>
                                    <input
                                        ref={passwordInputRef}
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-2 rounded-xl bg-[#0f1318] text-cyan-100 placeholder-cyan-400/70 border border-cyan-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((p) => !p)}
                                        className="absolute inset-y-0 right-3 flex items-center text-cyan-300 hover:text-cyan-100 focus:outline-none"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7s4.477-7 10-7c1.326 0 2.588.263 3.75.738M15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9-542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                <div className="mt-2 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-xs text-cyan-300 hover:text-cyan-100 hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoggingIn || !isOnline}
                                className="w-full bg-cyan-400 disabled:bg-cyan-700/40 disabled:text-cyan-200/60 hover:bg-cyan-300 text-[#0a141d] font-semibold py-2 px-4 rounded-xl shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0"
                            >
                                {isLoggingIn ? 'Signing in…' : isOnline ? 'Login' : 'Offline'}
                            </button>
                        </form>

                        <div className="mt-6 flex justify-between text-sm text-cyan-300">
                            <button onClick={handleNewUser} className="hover:underline hover:text-cyan-100 transition">
                                New User?
                            </button>
                            <span className="text-cyan-500/60 select-none">IIML Network: {IIMLPrivate ? 'Yes' : 'No'}</span>
                        </div>

                        <div className="my-8 flex flex-col items-center gap-3">
                            <div className="relative w-full h-px bg-cyan-900">
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#0b1014] px-2 text-xs text-cyan-300/80">or</span>
                            </div>
                            <div className={`w-full flex justify-center ${!isOnline ? 'opacity-60 pointer-events-none' : ''}`} aria-disabled={!isOnline}>
                                <GoogleLogin onSuccess={handleGoogleLogin} onError={() => toast.error('Google login failed')} useOneTap={false} />
                            </div>
                            {!isOnline && <p className="text-xs text-amber-300 mt-1">Reconnect to enable Google sign-in.</p>}
                        </div>

                        <div className="mt-8 text-center text-sm text-gray-400 space-y-1">
                            <p>🌐 <strong>IP:</strong> {ip || 'Unknown'}</p>
                            <p>🧭 <strong>Browser:</strong> {userAgent || 'Unavailable'}</p>
                            <p>🈯 <strong>Language:</strong> {language || 'Unavailable'}</p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-cyan-500 text-xs">
                    <p>© {new Date().getFullYear()} Charon. All rights reserved.</p>
                </div>
            </div>
        </>
    );
}
