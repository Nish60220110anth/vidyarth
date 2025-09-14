import Head from 'next/head';
import { useRouter } from 'next/router';

export default function NewUser() {
    const router = useRouter();

    return (
        <>
            <Head>
                <title>New User – Shukracharya</title>
                <link
                    href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-[#0d1b24] to-[#0a141d] text-cyan-100 font-[Urbanist] flex flex-col px-6 py-8">
                {/* Back button */}
                <button
                    onClick={() => router.push('/')}
                    className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-100 transition mb-8 w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
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

                {/* Main Content Centered */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-md w-full bg-[#111418] border border-cyan-900 rounded-xl p-6 shadow-md text-center space-y-5 animate-fade-in">
                        <h1 className="text-3xl font-bold text-cyan-300 tracking-wide">Access Restricted</h1>

                        <p className="text-base sm:text-lg text-cyan-200 leading-relaxed">
                            Please contact <span className="text-cyan-400 font-semibold">Team Synapse</span> to add your entry
                            to the Shukracharya portal.
                        </p>

                        <p className="text-sm text-gray-400 pt-2 border-t border-gray-700">
                            Only pre-approved users can access this system.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
