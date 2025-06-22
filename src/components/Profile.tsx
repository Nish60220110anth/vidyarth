
import { USER_ROLE } from '@prisma/client';
import { motion } from 'framer-motion';
import { roleIcons } from './Sidebar';

type Props = {
    name: string;
    email: string;
    role: string;
};

export default function Profile({ name, email, role }: Props) {
    const { icon, color } = roleIcons[role as USER_ROLE];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-sm mx-auto p-6 bg-gray-900 text-white rounded-2xl shadow-lg flex flex-col items-center space-y-4 font-[Urbanist]"
        >
            <div
                className={`w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center border-4 ${color}`}
            >
                {icon('w-12 h-12')}
            </div>

            <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">{name}</h2>
                <p className="text-sm text-gray-300">{email}</p>
                <p className={`text-xs font-medium uppercase ${color}`}>{role.replaceAll('_', ' ')}</p>
            </div>

            <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium">
                Edit Profile
            </button>
        </motion.div>
    );
}
