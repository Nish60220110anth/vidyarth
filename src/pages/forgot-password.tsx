import Head from 'next/head';
import { useRouter } from 'next/router';

export default function ForgotPassword() {
    const router = useRouter();

    return (
        <>
            <Head>
                <title>Forgot Password – Vidyarth</title>
                <link
                    href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 font-[Urbanist] text-gray-100 flex flex-col px-6 py-8">
                {/* Back button */}
                <button
                    onClick={() => router.push('/')}
                    className="text-cyan-300 hover:text-cyan-100 transition text-sm mb-8 w-fit"
                >
                    ← Back to Login
                </button>

                {/* Main Content Centered */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-lg text-center">
                        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Forgot Your Password?</h1>
                        <p className="text-lg text-gray-300 mb-5">
                            Please check the email previously sent by <span className="text-cyan-300 font-semibold">Team Synapse</span> containing your original login credentials. Reply 
                            to that email to reset your password.
                        </p>
                        <p className="text-lg text-gray-300">
                            If you can’t find it, kindly request <span className="text-cyan-300 font-semibold">Team Disha</span> to email us on your behalf to reset your password.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
