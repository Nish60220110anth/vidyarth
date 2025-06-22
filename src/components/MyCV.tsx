
import { motion } from 'framer-motion';
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function MyCV() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl mx-auto mt-12 p-6 bg-gray-900 text-white rounded-xl shadow-lg font-[Urbanist]"
        >
            <div className="flex items-center gap-3 mb-4">
                <DocumentTextIcon className="w-6 h-6 text-cyan-400" />
                <h2 className="text-lg font-semibold tracking-wide text-cyan-300">My CV</h2>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span>Nishanth P.</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Program:</span>
                    <span>PGP - IIM Lucknow</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Specialization:</span>
                    <span>Finance & Analytics</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span>nishanth@example.com</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Resume Version:</span>
                    <span>Summer Internship</span>
                </div>
            </div>

            <button className="mt-6 w-full flex justify-center items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md text-sm font-medium">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download PDF
            </button>
        </motion.div>
    );
}
