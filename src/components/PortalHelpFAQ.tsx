"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BuildingOffice2Icon,
    NewspaperIcon,
    DocumentTextIcon,
    ComputerDesktopIcon,
    CheckCircleIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    AcademicCapIcon,
    FilmIcon,
    FolderOpenIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { toTitleCase } from "./Profile";

type PortalHelpFAQProps = {
    role: string;
    name: string;
    email: string;
};

const featureList = [
    {
        label: "Dashboard",
        description:
            "Personalized overview with announcements, shortlists, and recommended content.",
        icon: <AcademicCapIcon className="w-5 h-5 text-cyan-400" />,
    },
    {
        label: "Company Directory",
        description:
            "Browse recruiters with domain tags, job descriptions, logos, and prep guides.",
        icon: <BuildingOffice2Icon className="w-5 h-5 text-cyan-500" />,
    },
    {
        label: "Placement News",
        description:
            "Stay updated with latest news filtered by company, domain, or date.",
        icon: <NewspaperIcon className="w-5 h-5 text-indigo-400" />,
    },
    {
        label: "CV Preparation",
        description:
            "View formatting tips, domain-based CV examples, and CV-related alerts.",
        icon: <DocumentTextIcon className="w-5 h-5 text-purple-500" />,
    },
    {
        label: "Mock Interviews",
        description:
            "Practice AI-powered or manual mocks with zero data retention.",
        icon: <ComputerDesktopIcon className="w-5 h-5 text-pink-500" />,
    },
    {
        label: "Shortlists & Announcements",
        description:
            "Track your shortlist status and access JD and preparation materials.",
        icon: <CheckCircleIcon className="w-5 h-5 text-emerald-400" />,
    },
    {
        label: "My CV",
        description:
            "Download your verified CV(s) and view version history and comments.",
        icon: <FolderOpenIcon className="w-5 h-5 text-cyan-300" />,
    },
    {
        label: "Videos",
        description:
            "Watch curated videos tagged by domain and company.",
        icon: <FilmIcon className="w-5 h-5 text-yellow-400" />,
    },
    {
        label: "Profile & Preferences",
        description:
            "Manage your role, email, and notification preferences.",
        icon: <UserCircleIcon className="w-5 h-5 text-gray-300" />,
    },
];

const faqList = [
    {
        question: "Can I upload or edit my CV here?",
        answer:
            "CV uploads are currently managed by the placement team. You can download all your verified versions here.",
    },
    {
        question: "Are AI mock interviews recorded?",
        answer:
            "No. AI mocks are completely private and reset each session. No data is stored.",
    },
    {
        question: "Who can see my shortlists and activity?",
        answer:
            "Only you and authorized placement team members can access your data. Nothing is public.",
    },
    {
        question: "Why can’t I see certain features?",
        answer:
            "Feature access depends on your assigned role. Contact PlaceCom for any access concerns.",
    },
];

export default function PortalHelpFAQ({ role, name, email }: PortalHelpFAQProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="w-full mx-auto px-6 py-12 font-[Urbanist] bg-gradient-to-b from-[#0d1b24] to-[#0a141d] min-h-screen text-white">
            <h1 className="text-3xl font-bold text-cyan-400 mb-4">Welcome, {toTitleCase(name)} 🎓</h1>
            <p className="text-base md:text-lg text-gray-300 mb-8">
                Charon is a centralized platform designed to support students through every stage of the placement process. Key features include:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
                <li>
                    <strong className="text-cyan-400">Comprehensive Company Access:</strong> View detailed company information, domains they came for, and job descriptions.
                </li>
                <li>
                    <strong className="text-cyan-400">Domain-Based Prep Resources:</strong> Explore curated content across Consulting, Finance, Marketing, Product Management, and more.
                </li>
                <li>
                    <strong className="text-cyan-400">Shortlists & CV Tracking:</strong> Monitor your shortlist status and manage all submitted CV versions.
                </li>
                <li>
                    <strong className="text-cyan-400">Curated Learning Materials:</strong> Access domain-tagged videos and prep guides tailored to your goals.
                </li>
                <li>
                    <strong className="text-cyan-400">Real-Time Placement Updates:</strong> Stay informed with the latest news, alerts, and announcements.
                </li>
                <li>
                    <strong className="text-cyan-400">Mock Interviews & Dashboards:</strong> Practice AI mocks and use personalized dashboards to stay prepared and organized.
                </li>
            </ul>


            <section className="mb-12">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <AcademicCapIcon className="w-5 h-5 text-cyan-400" />
                    Student Features
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {featureList.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 bg-[#0e1c27] border border-cyan-800 rounded-lg p-4 shadow">
                            <div className="flex-shrink-0 mt-1">{item.icon}</div>
                            <div>
                                <p className="font-medium text-white">{item.label}</p>
                                <p className="text-sm text-gray-300">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-indigo-400" />
                    Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                    {faqList.map((faq, index) => (
                        <div key={index} className="border border-cyan-800 rounded-lg bg-[#0e1c27] shadow-sm">
                            <button
                                className="flex justify-between items-center w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-[#112531] transition"
                                onClick={() => toggle(index)}
                            >
                                <span>{faq.question}</span>
                                <motion.span animate={{ rotate: openIndex === index ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronRightIcon className="w-5 h-5 text-cyan-400" />
                                </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden px-4 pb-4 text-sm text-gray-300"
                                    >
                                        {faq.answer}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </section>

            <div className="bg-[#0e1c27] border border-cyan-800 rounded-xl px-5 py-4">
                <h3 className="font-semibold text-cyan-400 mb-1 text-base flex items-center gap-2">
                    <Cog6ToothIcon className="w-4 h-4 text-cyan-400" />
                    Pro Tip
                </h3>
                <p className="text-sm text-gray-300">
                    Use <span className="bg-gray-700 px-1 rounded text-xs font-mono">Alt + [Key]</span> shortcuts.
                    For example, <span className="bg-gray-700 px-1 rounded text-xs font-mono">Alt + C</span> opens Company Directory.
                </p>
            </div>
        </div>
    );
}
