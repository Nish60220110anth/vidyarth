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

const features = [
    {
        title: "Explore Companies",
        description: "View detailed company profiles with domains, roles, and logos.",
        icon: <AcademicCapIcon className="w-6 h-6 text-cyan-600" />,
    },
    {
        title: "Latest News",
        description: "Stay informed with domain-specific placement alerts and updates.",
        icon: <NewspaperIcon className="w-6 h-6 text-cyan-600" />,
    },
    {
        title: "CV Preparation",
        description: "Get curated CV tips, templates, and structure guidelines.",
        icon: <DocumentTextIcon className="w-6 h-6 text-cyan-600" />,
    },
    {
        title: "Domain Resources",
        description: "Access prep materials for Consulting, Finance, Marketing, and more.",
        icon: <SparklesIcon className="w-6 h-6 text-cyan-600" />,
    },
    {
        title: "Mock Interviews",
        description: "Practice interviews and track your feedback and progress.",
        icon: <UsersIcon className="w-6 h-6 text-cyan-600" />,
    },
];

export default function WelcomePage({ onGotoDashboard }: { onGotoDashboard?: () => void }) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 font-[Urbanist] px-4 py-8 md:px-6 flex flex-col items-center justify-center">
            <motion.div
                className="text-center mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                    Welcome to <span className="text-cyan-600">Vidyarth</span> 🎓
                </h1>
                <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto">
                    Your all-in-one portal to navigate placements confidently.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl w-full px-2">
                {features.map((feature, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.1 + 0.3 }}
                        className="bg-white rounded-xl shadow p-5 flex items-start gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                    >
                        <div className="p-2 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                            {feature.icon}
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">{feature.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="mt-10"
            >
                <PrimaryButton onClick={() => onGotoDashboard?.()}>
                    Go to Dashboard
                </PrimaryButton>
            </motion.div>
        </div>
    );
}
