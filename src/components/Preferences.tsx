
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function Preferences() {
    const [emailNotif, setEmailNotif] = useState(true);
    const [resumeVersion, setResumeVersion] = useState('Summer');
    const [domains, setDomains] = useState<string[]>(['Consulting']);

    const domainOptions = ['Consulting', 'Finance', 'Marketing', 'Product', 'Operations', 'GenMan'];

    const toggleDomain = (d: string) => {
        setDomains((prev) =>
            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl mx-auto mt-12 p-6 bg-gray-900 text-white rounded-xl shadow-lg font-[Urbanist] space-y-6"
        >
            <div className="flex items-center gap-3">
                <Cog6ToothIcon className="w-6 h-6 text-cyan-400" />
                <h2 className="text-lg font-semibold tracking-wide text-cyan-300">Preferences</h2>
            </div>

            {/* Email Notification Toggle */}
            <div className="flex justify-between items-center">
                <span>Email Notifications</span>
                <button
                    onClick={() => setEmailNotif(!emailNotif)}
                    className={`w-11 h-6 rounded-full p-1 transition ${emailNotif ? 'bg-cyan-500' : 'bg-gray-600'
                        }`}
                >
                    <div
                        className={`h-4 w-4 rounded-full bg-white transition ${emailNotif ? 'translate-x-5' : 'translate-x-0'
                            }`}
                    />
                </button>
            </div>

            {/* Resume Version */}
            <div>
                <label className="block mb-1 text-sm text-gray-300">Resume Version</label>
                <select
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                    value={resumeVersion}
                    onChange={(e) => setResumeVersion(e.target.value)}
                >
                    <option value="Summer">Summer</option>
                    <option value="Final">Final</option>
                    <option value="Domain-Specific">Domain-Specific</option>
                </select>
            </div>

            {/* Domain Preferences */}
            <div>
                <label className="block mb-1 text-sm text-gray-300">Interested Domains</label>
                <div className="flex flex-wrap gap-2 mt-1">
                    {domainOptions.map((domain) => (
                        <button
                            key={domain}
                            onClick={() => toggleDomain(domain)}
                            className={`px-3 py-1 text-xs rounded-full border ${domains.includes(domain)
                                    ? 'bg-cyan-700 border-cyan-400 text-white'
                                    : 'bg-gray-800 border-gray-600 text-gray-300'
                                }`}
                        >
                            {domain}
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
