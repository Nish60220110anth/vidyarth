import Head from 'next/head';
import { useRouter } from 'next/router';

export default function ForgotPassword() {
    const router = useRouter();

    return (
        <>
            <Head>
                <title>Forgot Password - Shukracharya</title>
                <meta name="description" content="Recover your Shukracharya portal password. Contact Team Synapse for reset instructions." />
                <meta property="og:title" content="Forgot Password - Shukracharya Portal" />
                <meta property="og:description" content="Please check your original email or contact Team Synapse to reset your credentials." />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-[#0d1b24] to-[#0a141d] font-[Urbanist] text-cyan-100 flex flex-col px-6 py-8">

                {/* Back button */}
                <button
                    onClick={() => router.push('/')}
                    aria-label="Go back to login page"
                    className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-200 transition-colors duration-200 mb-8 w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Login
                </button>


                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-xl text-left space-y-6">
                        <h1 className="text-4xl font-bold text-cyan-300">Forgot Your Password?</h1>

                        <p className="text-base sm:text-lg text-cyan-200 leading-relaxed">
                            Check your inbox for an email previously sent by
                            <span className="text-cyan-300 font-semibold"> Team Synapse</span>. It contains your original login credentials. You can directly reply to that email to request a reset.
                        </p>

                        <p className="text-base sm:text-lg text-gray-400 leading-relaxed">
                            Can't find the email? No problem. Just write to us at
                            <a
                                href="mailto:km@iiml.ac.in"
                                className="ml-1 text-cyan-400 underline hover:text-cyan-200 font-medium"
                            >
                                km@iiml.ac.in
                            </a>
                            , and we'll help you regain access.
                        </p>

                        <div className="text-sm text-gray-500 pt-4 border-t border-gray-700">
                            ⚠️ For security reasons, we do not support self-service resets directly from the portal.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
