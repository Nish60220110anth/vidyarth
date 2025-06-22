import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AcademicCapIcon,
    BuildingOffice2Icon,
    NewspaperIcon,
    DocumentTextIcon,
    ComputerDesktopIcon,
    SpeakerWaveIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    CheckCircleIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";

type PortalHelpFAQProps = {
    role: string;
    name: string;
    email: string;
};

const iconMap = {
    COMPANY: <BuildingOffice2Icon className="w-5 h-5 text-cyan-600" />,
    NEWS: <NewspaperIcon className="w-5 h-5 text-indigo-600" />,
    CV: <DocumentTextIcon className="w-5 h-5 text-purple-600" />,
    MOCK: <ComputerDesktopIcon className="w-5 h-5 text-pink-600" />,
    SHORTLISTS: <CheckCircleIcon className="w-5 h-5 text-emerald-600" />,
    PROFILE: <UserCircleIcon className="w-5 h-5 text-gray-600" />,
    PREFERENCES: <Cog6ToothIcon className="w-5 h-5 text-yellow-500" />,
};

export default function PortalHelpFAQ({ role, name, email }: PortalHelpFAQProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const getStudentFeatures = () => [
        {
            label: "Company Directory",
            description: "Explore recruiters with domain tags, logos, and JD access.",
            icon: iconMap.COMPANY,
        },
        {
            label: "Latest News",
            description: "Get timely updates, announcements, and batch-specific alerts.",
            icon: iconMap.NEWS,
        },
        {
            label: "CV Preparation",
            description: "Follow structured guidelines for CVs, including domain-based examples.",
            icon: iconMap.CV,
        },
        {
            label: "AI Mock Interviews",
            description: "Practice interviews with an AI assistant, no data stored.",
            icon: iconMap.MOCK,
        },
        {
            label: "Shortlists & Announcements",
            description: "View your shortlist status and company announcements.",
            icon: iconMap.SHORTLISTS,
        },
        {
            label: "Profile & Access",
            description: "Check your role, email, and access level.",
            icon: iconMap.PROFILE,
        },
        {
            label: "Preferences",
            description: "Customize your notification and comms settings (coming soon).",
            icon: iconMap.PREFERENCES,
        },
    ];

    const faqList = [
        {
            question: "Can I upload or edit my CV here?",
            answer:
                "Currently, you can explore format guidelines and domain tips. Uploading will be enabled in the next release.",
        },
        {
            question: "Is my activity on Vidyarth visible to others?",
            answer:
                "Only essential access logs are stored. Admins can view minimal data for portal operations. Nothing is publicly visible.",
        },
        {
            question: "Are AI mock sessions recorded?",
            answer:
                "No. Sessions are ephemeral and reset each time. Your data remains private.",
        },
        {
            question: "What happens if I lose access to a feature?",
            answer:
                "Access is based on your current role. Contact PlaceCom or Admin for clarification.",
        },
    ];

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 font-[Inter,sans-serif] text-gray-800">
            <h1 className="text-3xl font-bold text-blue-800 mb-4">Welcome, {name?.split(" ")[0] || "Student"} 🎓</h1>
            <p className="text-base md:text-lg text-gray-700 mb-8">
                You’re logged in as <span className="font-semibold text-cyan-600">{role}</span> (<span className="text-gray-500">{email}</span>). Here’s how you can make the most of <strong>Vidyarth</strong>.
            </p>

            <section className="mb-12">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">📌 Key Features</h2>
                <ul className="space-y-4">
                    {getStudentFeatures().map((item, index) => (
                        <li key={index} className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex-shrink-0 mt-1">{item.icon}</div>
                            <div>
                                <p className="font-medium text-gray-800">{item.label}</p>
                                <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mb-12">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">❓ Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqList.map((faq, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg bg-white shadow-sm">
                            <button
                                className="flex justify-between items-center w-full px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition"
                                onClick={() => toggle(index)}
                            >
                                <span>{faq.question}</span>
                                <motion.span animate={{ rotate: openIndex === index ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                                </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden px-4 pb-4 text-sm text-gray-600"
                                    >
                                        {faq.answer}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </section>

            <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-5 py-4">
                <h3 className="font-semibold text-cyan-800 mb-1 text-base">💡 Pro Tip</h3>
                <p className="text-sm text-cyan-900">
                    Use <span className="bg-gray-200 px-1 rounded text-xs font-mono">Alt + [Key]</span> shortcuts.
                    Try <span className="bg-gray-200 px-1 rounded text-xs font-mono">Alt + C</span> to open the Company Directory.
                </p>
            </div>
        </div>
    );
}
