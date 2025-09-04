import { useRouter } from "next/router";
import {
    AcademicCapIcon,
    NewspaperIcon,
    DocumentTextIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import toast from "react-hot-toast";
import { ComponentType, SVGProps } from "react";

type Feature = {
    title: string;
    description: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    router_path: string;
};

const features: Feature[] = [
    {
        title: "Explore Companies",
        description: "View detailed company profiles with domains, roles, and logos.",
        Icon: AcademicCapIcon,
        router_path: "COMPANY DIRECTORY",
    },
    {
        title: "Latest News",
        description: "Stay informed with domain-specific placement alerts and updates.",
        Icon: NewspaperIcon,
        router_path: "LATEST NEWS",
    },
    {
        title: "Interview Round Preparation",
        description:
            "Essentials for Personal Interview (PI), Group Discussion (GD) & HR—frameworks, do’s & don’ts, and sample prompts.",
        Icon: DocumentTextIcon,
        router_path: "ROUND PREP",
    },
    {
        title: "Domain Resources",
        description: "Access prep materials for Consulting, Finance, Marketing, and more.",
        Icon: SparklesIcon,
        router_path: "DOMAIN PREP",
    },
    // Removed: Mock Interviews
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
                    Welcome to <span className="text-slate-100">Charon</span> 🎓
                </h1>
                <div className="ui-underline mb-4" />
                <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto">
                    Your all-in-one portal to navigate placements confidently.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full px-2">
                {features.map((feature, idx) => {
                    const Icon = feature.Icon;
                    return (
                        <motion.button
                            key={feature.router_path}
                            type="button"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 + 0.3 }}
                            onClick={async () => {
                                const res = await generateSecureURL(feature.router_path, 0);
                                if (!res.success) return toast.error(res.error);
                                router.push(
                                    { query: { auth: encodeURIComponent(res.url) } },
                                    undefined,
                                    { shallow: true }
                                );
                            }}
                            className="ui-card-action group p-6 w-full flex flex-col items-center text-center gap-3 relative"
                        >
                            <div className="flex items-center justify-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-800/60 flex items-center justify-center shadow-inner ring-1 ring-cyan-900/40">
                                    <Icon className="h-6 w-6 text-cyan-300 transition-colors group-hover:text-cyan-200" />
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold text-slate-100">
                                    {feature.title}
                                </h3>
                            </div>

                            <p className="ui-content-hover text-sm text-slate-400">
                                {feature.description}
                            </p>

                            {/* subtle bottom accent on hover */}
                            <span className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-700/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                    );
                })}
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

            <div className="mt-2 w-full max-w-6xl">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-800/40 to-transparent mb-3" />
                <p className="mx-auto w-fit px-3 py-1 text-[12px] sm:text-sm rounded-full border border-cyan-800/60 bg-[#0b141b]/80 text-cyan-300/90 shadow-[0_0_10px_rgba(0,255,255,0.06)]">
                    © {new Date().getFullYear()} Charon • Built & supported by{" "}
                    <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-teal-200 to-cyan-100">
                        Team Synapse
                    </span>{" "}
                    <span className="opacity-80">×</span>{" "}
                    <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200/80 to-teal-200/80">
                        Team Disha
                    </span>
                </p>
            </div>
        </div>
    );
}
