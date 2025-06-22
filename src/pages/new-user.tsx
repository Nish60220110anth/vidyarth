import Head from 'next/head';
import { useRouter } from 'next/router';

export default function NewUser() {
    const router = useRouter();

    return (
        <>
            <Head>
                <title>New User – Vidyarth</title>
                <link
                    href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-gray-100 flex flex-col px-6 py-8">
                {/* Back button */}
                <button
                    onClick={() => router.push('/')}
                    className="text-cyan-300 hover:text-cyan-100 transition text-sm mb-8 w-fit"
                >
                    ← Back to Login
                </button>

                {/* Main Content Centered */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-md text-center">
                        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Access Restricted</h1>
                        <p className="text-lg text-gray-300">
                            Please contact <span className="text-cyan-300 font-semibold">Team Synapse</span> to add your entry
                            to the Vidyarth portal.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
