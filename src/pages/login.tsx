import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { GoogleLogin, googleLogout, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface GooglePayload {
    email: string;
    name: string;
    picture: string;
}

export default function LoginPage({ ip, IIMLPrivate, userAgent, language }: {
    ip?: string;
    IIMLPrivate?: boolean;
    userAgent?: string;
    language?: string;
}) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [checkingSession, setCheckingSession] = useState(true);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const res = await fetch('/api/auth/user');
            if (res.ok) {
                const data = await res.json();
                if (data?.email) {
                    router.push('/dashboard');
                    return;
                }
            }
            setCheckingSession(false);
        };

        checkSession();
    }, []);

    if (checkingSession) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password }),
            });

            const data = await res.json();

            if (!data.success) {
                toast.error(data?.error || 'Login failed. Try again.');
                setIsLoggingIn(false);
                return;
            } else {
                toast.success(`Welcome, ${username} (${data.role})`);
                setIsLoggingIn(false);

                if (data.role?.toLowerCase() === 'admin') {
                    setTimeout(() => router.push('/admin'), 1200);
                    return;
                }
                setTimeout(() => router.push('/dashboard'), 1200);
            }

        } catch (error) {
            toast.error('Network error. Please try again later.');
            setIsLoggingIn(false);
        }
    };

    const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
        try {
            if (!credentialResponse.credential) {
                toast.error("Google login failed");
                return;
            }
            const decoded = jwtDecode<GooglePayload>(credentialResponse.credential);

            const res = await fetch('/api/auth/google-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: decoded.email, name: decoded.name })
            });

            const data = await res.json();

            setIsLoggingIn(false);
            googleLogout();

            if (res.ok) {

                if (data.is_active && data.is_verified) {
                    toast.success(`Welcome, ${data.name}(${data.role})`);

                    const session = await fetch('/api/auth/user');
                    if (session.ok) {
                        const sessionData = await session.json();
                        if (sessionData?.email) {
                            setTimeout(() => router.push('/dashboard'), 1200);
                            return;
                        }
                    } else {
                        toast.error("Failed to fetch session data. Please try again.");
                        setTimeout(() => router.push('/'), 600);
                        return;
                    }
                } else if (data.is_active && !data.is_verified) {
                    toast.error("Your account is pending approval. Please wait for admin verification.");
                    setTimeout(() => router.push('/requires-approval'), 600);
                } else {
                    toast.error("Your account is inactive. Please contact support.");
                    setTimeout(() => router.push('/'), 1200);
                }
            } else {
                toast.error(data?.error || 'Login failed. Approval may be pending.');
            }
        } catch (error) {
            toast.error("Failed to authenticate using Google");
        }
    };

    const handleForgotPassword = () => {
        router.push('/forgot-password');
    };

    const handleNewUser = () => {
        router.push('/new-user');
    };

    return (
        <>
            <Head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 font-[Inter] relative overflow-hidden">
                {isLoggingIn && (
                    <div className="absolute inset-0 z-50 bg-black bg-opacity-70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                        <div className="h-16 w-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,255,255,0.6)] mb-4" />
                        <p className="text-cyan-200 text-lg font-medium animate-pulse">Logging you in...</p>
                    </div>
                )}

                <div className="w-full max-w-md bg-gray-800/90 backdrop-blur-md border border-gray-700 p-8 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-fade-in z-10">
                    <h1 className="text-4xl font-extrabold text-center text-gray-100 mb-8 tracking-wide">Welcome to Vidyarth</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">Email ID</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                                required
                            />
                        </div>

                        <div className="relative">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pr-12 px-4 py-2 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/5 transform p-1 focus:outline-none"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7s4.477-7 10-7c1.326 0 2.588.263 3.75.738M15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-cyan-400 hover:bg-cyan-300 text-gray-900 font-semibold py-2 px-4 rounded-xl shadow transition duration-300 ease-in-out"
                        >
                            Login
                        </button>
                    </form>

                    <div className="mt-6 flex justify-between text-sm">
                        <button
                            onClick={handleNewUser}
                            className="text-cyan-300 hover:underline hover:text-cyan-100 transition"
                        >
                            New User?
                        </button>
                        <button
                            onClick={handleForgotPassword}
                            className="text-cyan-300 hover:underline hover:text-cyan-100 transition"
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <div className="my-8 flex justify-center">
                        <GoogleLogin onSuccess={handleGoogleLogin} onError={() => toast.error("Google login failed")} />
                    </div>


                    <div className="mt-8 text-center text-sm text-gray-400">
                        <p>🌐 <strong>IP:</strong> {ip || 'Unknown'}</p>
                        <p>🧭 <strong>Browser:</strong> {userAgent || 'Unavailable'}</p>
                        <p>🈯 <strong>Language:</strong> {language || 'Unavailable'}</p>
                    </div>
                </div>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-500 text-xs">
                    <p>© 2025 Vidyarth. All rights reserved.</p>
                </div>
            </div>
        </>
    );
}