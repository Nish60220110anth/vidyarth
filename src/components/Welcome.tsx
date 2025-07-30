// components/Welcome.tsx

import { useRouter } from "next/router";
import {
    AcademicCapIcon,
    NewspaperIcon,
    DocumentTextIcon,
    SparklesIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import toast from "react-hot-toast";

const features = [
    {
        title: "Explore Companies",
        description: "View detailed company profiles with domains, roles, and logos.",
        icon: <AcademicCapIcon className="ui-icon group-hover:text-cyan-200" />,
        router_path: "COMPANY DIRECTORY",
    },
    {
        title: "Latest News",
        description: "Stay informed with domain-specific placement alerts and updates.",
        icon: <NewspaperIcon className="ui-icon group-hover:text-cyan-200" />,
        router_path: "LATEST NEWS",
    },
    {
        title: "CV Preparation",
        description: "Get curated CV tips, templates, and structure guidelines.",
        icon: <DocumentTextIcon className="ui-icon group-hover:text-cyan-200" />,
        router_path: "CV PREP",
    },
    {
        title: "Domain Resources",
        description: "Access prep materials for Consulting, Finance, Marketing, and more.",
        icon: <SparklesIcon className="ui-icon group-hover:text-cyan-200" />,
        router_path: "DOMAIN PREP",
    },
    {
        title: "Mock Interviews",
        description: "Practice interviews and track your feedback and progress.",
        icon: <UsersIcon className="ui-icon group-hover:text-cyan-200" />,
        router_path: "AI MOCK",
    },
];

export default function WelcomePage({
    onGotoDashboard,
}: {
    onGotoDashboard: () => Promise<void>;
}) {
    const router = useRouter();

    return (
        <div className="min-h-full bg-gradient-to-br from-[#0b141b] to-[#091119] font-[Urbanist] px-4 py-10 md:px-8 flex flex-col items-center justify-center w-full text-slate-200">
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 mb-4 tracking-tight">
                    Welcome to <span className="text-slate-100">Vidyarth</span> 🎓
                </h1>
                <div className="ui-underline mb-4" />
                <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto">
                    Your all-in-one portal to navigate placements confidently.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full px-2">
                {features.map((feature, idx) => (
                    <motion.button
                        key={idx}
                        type="button"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 + 0.3 }}
                        onClick={async () => {
                            const res = await generateSecureURL(feature.router_path, 0);
                            if (!res.success) {
                                toast.error(res.error);
                                return;
                            }
                            router.push(
                                { query: { auth: encodeURIComponent(res.url) } },
                                undefined,
                                { shallow: true }
                            );
                        }}
                        className="ui-card-action flex items-start gap-4 group p-6 w-full"
                    >
                        <div className="p-3 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 shadow-inner">
                            {feature.icon}
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-semibold text-slate-100">
                                {feature.title}
                            </h3>
                            <p className="ui-content-hover text-sm mt-1">{feature.description}</p>
                        </div>
                    </motion.button>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="mt-12"
            >
                <motion.button
                    onClick={onGotoDashboard}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="ui-btn ui-btn--neutral"
                >
                    Go to All Companies Directory
                </motion.button>
            </motion.div>
        </div>
    );
}
