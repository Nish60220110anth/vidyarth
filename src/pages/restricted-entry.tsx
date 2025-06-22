import Head from 'next/head';
import { useRouter } from 'next/router';

export default function RestrictedUse() {

    const router = useRouter();

    const handleGoHome = () => {
        router.push('/');
    };
  
    return (
        <>
            <Head>
                <title>Restricted Network</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 font-[Inter] relative overflow-hidden">
                <div className="w-full max-w-lg bg-gray-800/90 backdrop-blur-md border border-gray-700 p-10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-fade-in z-10 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-100 mb-6">🔒 Restricted Access</h1>
                    <p className="text-gray-300 mb-4 text-lg">
                        This portal cannot be accessed from the current network.
                    </p>
                    <p className="text-gray-400 mb-8">
                        Please disconnect from the IIM Lucknow internal/private network and try again using an external network or VPN.
                    </p>

                    <button
                        onClick={handleGoHome}
                        className="bg-cyan-400 hover:bg-cyan-300 text-gray-900 font-semibold py-2 px-6 rounded-xl shadow transition duration-300 ease-in-out"
                    >
                        Go to Home
                    </button>

                </div>
            </div>
        </>
    );
}
