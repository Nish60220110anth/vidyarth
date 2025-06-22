import { useRouter } from 'next/router';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getSession } from '@/lib/getSession';
import { USER_ROLE } from '@prisma/client';
import { IronSession, IronSessionData } from 'iron-session';

export default function AdminPage() {
    const router = useRouter();

    const adminActions = [
        { label: 'Set Permissions', path: '/admin/set-permissions' },
        { label: 'Manage Users', path: '/admin/manage-users' },
        { label: 'Send Email Notifications', path: '/admin/send-mail' },
    ];

    const handleClick = (path: string) => {
        router.push(path);
    };

    return (
        <>
            <Head>
                <title>Admin Dashboard</title>
            </Head>

            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4 py-10">
                <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
                    {adminActions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => handleClick(action.path)}
                            className="w-full py-4 px-6 bg-gray-800 border border-gray-600 hover:border-cyan-400 hover:shadow-xl rounded-xl transition text-lg font-medium text-center hover:bg-gray-700"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const session: IronSession<IronSessionData> = await getSession(ctx);

    if (!session.email || session.role !== USER_ROLE.ADMIN) {
        return {
            redirect: {
                destination: '/',
                permanent: false,
            },
        };
    }

    return {
        props: {
            email: session.email,
            role: session.role,
            name: session.name,
        },
    };
  };