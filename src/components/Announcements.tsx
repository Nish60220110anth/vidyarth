import { motion } from 'framer-motion';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';

const announcements = [
    {
        title: 'Final Resume Deadline',
        message: 'Submit your final resume by June 25, 11:59 PM.',
        type: 'Alert',
        time: '2 hrs ago',
    },
    {
        title: 'New Company Added',
        message: 'Google has been added to the placement list.',
        type: 'Info',
        time: '5 hrs ago',
    },
    {
        title: 'Shortlist Released',
        message: 'Shortlist for Unilever has been uploaded.',
        type: 'Alert',
        time: '1 day ago',
    },
];

const typeStyles: Record<string, string> = {
    Alert: 'bg-red-600/20 text-red-300 border-red-400',
    Info: 'bg-blue-600/20 text-blue-300 border-blue-400',
};

export default function Announcements() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto mt-12 p-6 bg-gray-900 text-white rounded-xl shadow-lg font-[Urbanist]"
        >
            <div className="flex items-center gap-3 mb-4">
                <SpeakerWaveIcon className="w-6 h-6 text-cyan-400" />
                <h2 className="text-lg font-semibold tracking-wide text-cyan-300">Announcements</h2>
            </div>

            <ul className="space-y-4">
                {announcements.map((item, idx) => (
                    <li
                        key={idx}
                        className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium">{item.title}</h3>
                            <span
                                className={`px-2 py-1 text-xs rounded-md border font-semibold ${typeStyles[item.type]}`}
                            >
                                {item.type}
                            </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{item.message}</p>
                        <p className="text-xs text-gray-500 mt-2">{item.time}</p>
                    </li>
                ))}
            </ul>
        </motion.div>
    );
}
