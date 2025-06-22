import { motion } from "framer-motion";
import { UserCircleIcon, EnvelopeIcon } from "@heroicons/react/24/solid";

interface MySectionProps {
    name: string;
    email: string;
    role: string;
}

export default function MySection({ name, email, role }: MySectionProps) {
    return (
        <motion.div
            className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg w-full max-w-xl mx-auto mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex items-center gap-4 mb-6">
                <UserCircleIcon className="w-14 h-14 text-cyan-400" />
                <div>
                    <h2 className="text-2xl font-bold">{name}</h2>
                    <p className="text-sm text-gray-400">{role}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <EnvelopeIcon className="w-5 h-5 text-cyan-300" />
                <p className="text-sm break-all">{email}</p>
            </div>
        </motion.div>
    );
}
