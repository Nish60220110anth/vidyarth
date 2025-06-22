import { motion } from 'framer-motion';

type ShortlistStatus = 'SHORTLISTED' | 'WAITLISTED' | 'REJECTED';

type ShortlistEntry = {
    company: string;
    role: string;
    round: string;
    status: ShortlistStatus;
};

type Props = {

};

const sampleData = [
    { company: 'McKinsey & Company', role: 'Consulting Analyst', round: 'Final', status: 'SHORTLISTED' },
    { company: 'Amazon', role: 'SDE Intern', round: 'Technical', status: 'WAITLISTED' },
    { company: 'Unilever', role: 'Marketing Intern', round: 'HR', status: 'REJECTED' },
];
  

const statusStyles: Record<ShortlistStatus, string> = {
    SHORTLISTED: 'text-green-400',
    WAITLISTED: 'text-yellow-300',
    REJECTED: 'text-red-400',
};

export default function Shortlists({  }: Props) {

    const data = sampleData

    return (
        <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-4xl mx-auto mt-8 rounded-xl overflow-hidden bg-gray-900 shadow-lg font-[Urbanist]"
        >
            <table className="w-full table-auto border-collapse text-sm text-left">
                <thead className="bg-gray-800 text-cyan-400 text-xs uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Round</th>
                        <th className="px-6 py-3">Status</th>
                    </tr>
                </thead>
                <tbody className="text-white divide-y divide-gray-700">
                    {data.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-gray-800 transition duration-200">
                            <td className="px-6 py-4">{entry.company}</td>
                            <td className="px-6 py-4">{entry.role}</td>
                            <td className="px-6 py-4">{entry.round}</td>
                            <td className={`px-6 py-4 font-medium ${statusStyles[entry.status as ShortlistStatus]}`}>
                                {entry.status}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </motion.div>
    );
}
