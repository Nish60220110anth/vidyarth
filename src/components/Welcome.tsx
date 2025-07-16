import { useRouter } from "next/router";
import PrimaryButton from "@/components/PrimaryButton";
import {
    AcademicCapIcon,
    NewspaperIcon,
    DocumentTextIcon,
    SparklesIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { ACCESS_PERMISSION } from "@prisma/client";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import toast from "react-hot-toast";

const features = [
    {
        title: "Explore Companies",
        description: "View detailed company profiles with domains, roles, and logos.",
        icon: <AcademicCapIcon className="w-6 h-6 text-cyan-600 group-hover:text-cyan-500 transition-colors" />,
        router_path: "COMPANY DIRECTORY",
    },
    {
        title: "Latest News",
        description: "Stay informed with domain-specific placement alerts and updates.",
        icon: <NewspaperIcon className="w-6 h-6 text-cyan-600 group-hover:text-cyan-500 transition-colors" />,
        router_path: "LATEST NEWS"
    },
    {
        title: "CV Preparation",
        description: "Get curated CV tips, templates, and structure guidelines.",
        icon: <DocumentTextIcon className="w-6 h-6 text-cyan-600 group-hover:text-cyan-500 transition-colors" />,
        router_path: "CV PREP"
    },
    {
        title: "Domain Resources",
        description: "Access prep materials for Consulting, Finance, Marketing, and more.",
        icon: <SparklesIcon className="w-6 h-6 text-cyan-600 group-hover:text-cyan-500 transition-colors" />,
        router_path: "DOMAIN PREP"
    },
    {
        title: "Mock Interviews",
        description: "Practice interviews and track your feedback and progress.",
        icon: <UsersIcon className="w-6 h-6 text-cyan-600 group-hover:text-cyan-500 transition-colors" />,
        router_path: "AI MOCK"
    },
];

export default function WelcomePage({ onGotoDashboard }: { onGotoDashboard: () => Promise<void> }) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50 font-[Urbanist] px-4 py-10 md:px-8 flex flex-col items-center justify-center w-full">
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-cyan-600 to-blue-500 text-transparent bg-clip-text mb-4">
                    Welcome to Vidyarth 🎓
                </h1>
                <p className="text-gray-700 text-lg sm:text-xl max-w-2xl mx-auto">
                    Your all-in-one portal to navigate placements confidently.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full px-2">
                {features.map((feature, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 + 0.3 }}
                        onClick={async () => {
                            const res = await generateSecureURL(feature.router_path, 0);

                            if (!res.success) {
                                toast.error(res.error)
                                return;
                            }

                            router.push({ query: { auth: encodeURIComponent(res.url) } }, undefined, { shallow: true });
                        }}
                        className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6 flex items-start gap-4 group transform hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)]"
                    >
                        <div className="p-3 rounded-full bg-cyan-100 flex items-center justify-center shrink-0 shadow-inner">
                            {feature.icon}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                        </div>
                    </motion.div>
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
                    className="px-6 py-3 text-white font-semibold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-700 hover:to-blue-600 shadow-lg transition-all"
                >
                    Go to All Companies Directory
                </motion.button>
            </motion.div>
        </div>
    );
}
