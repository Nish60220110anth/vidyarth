import { useRouter } from 'next/router';
import Head from 'next/head';

export default function PendingApproval() {
    const router = useRouter();

    const goHome = () => router.push('/');

    return (
        <>
            <Head>
                <title>Approval Required - Vidyarth</title>
            </Head>

            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white">
                <div className="bg-gray-800/90 backdrop-blur-md p-10 rounded-2xl border border-gray-700 shadow-lg max-w-lg w-full text-center animate-fade-in">
                    <h1 className="text-3xl font-bold text-cyan-400 mb-4">⏳ Awaiting Approval</h1>
                    <p className="text-gray-300 text-md">
                        Your account has been created but is pending admin approval.
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                        Please contact the Disha or check back later.
                    </p>
                    <button
                        onClick={goHome}
                        className="mt-6 bg-cyan-400 hover:bg-cyan-300 text-gray-900 font-semibold px-6 py-2 rounded-xl shadow transition duration-300 ease-in-out"
                    >
                        Go to Home
                    </button>
                </div>

                <div className="absolute bottom-4 text-xs text-gray-500">
                    © 2023 Vidyarth. All rights reserved.
                </div>
            </div>
        </>
    );
}
