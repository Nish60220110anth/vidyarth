import { useState } from "react";
import { motion } from "framer-motion";
import { SparklesIcon } from "@heroicons/react/24/outline";

const DOMAIN_TIPS: Record<string, { title: string; description: string }[]> = {
    Consulting: [
        {
            title: "Show Structured Thinking",
            description: "Highlight case-solving frameworks or strategic planning experiences."
        },
        {
            title: "Quantify Impact",
            description: "E.g., 'Led team of 5 to reduce processing time by 30%'."
        },
        {
            title: "Demonstrate Leadership",
            description: "PoRs and team initiatives carry strong weight."
        }
    ],
    Finance: [
        {
            title: "Emphasize Financial Tools",
            description: "Mention Excel modeling, Bloomberg Terminal, CFA, or accounting tools."
        },
        {
            title: "Highlight Quant Skills",
            description: "Quantify metrics like ROI, portfolio returns, or valuation improvements."
        },
        {
            title: "Mention Relevant Competitions",
            description: "CFA Research Challenge, Stock pitch contests, or corporate finance case wins."
        }
    ],
    ProdMan: [
        {
            title: "Showcase Product Thinking",
            description: "Mention product lifecycle, roadmap ownership, or user-centric design."
        },
        {
            title: "Emphasize Tech + Business Blend",
            description: "Highlight tools (Jira, Figma, SQL) and metrics (user growth, retention)."
        },
        {
            title: "Display Cross-functional Experience",
            description: "Worked with tech, marketing, and design teams? Add it."
        }
    ],
    Marketing: [
        {
            title: "Highlight Campaigns & Creativity",
            description: "E.g., 'Designed Instagram strategy, resulting in 40% follower growth'."
        },
        {
            title: "Include Analytics Tools",
            description: "Google Analytics, Meta Ads, SEO/SEM keywords show practical experience."
        },
        {
            title: "Mention Brand or Market Research",
            description: "Include survey projects, market sizing, positioning exercises."
        }
    ],
    Operations: [
        {
            title: "Focus on Efficiency & Process",
            description: "E.g., 'Reduced procurement cycle by 25% via automation'."
        },
        {
            title: "Use Ops Lingo",
            description: "Words like TAT, SLA, lean ops, Kaizen, six sigma add credibility."
        },
        {
            title: "Quantify Operational Impact",
            description: "Time saved, cost reduced, process uptime — always give numbers."
        }
    ],
    GenMan: [
        {
            title: "Demonstrate Versatility",
            description: "Highlight a mix of leadership, creativity, and initiative."
        },
        {
            title: "Show Execution at Scale",
            description: "E.g., 'Managed 50+ member fest team with ₹5L+ budget'."
        },
        {
            title: "Balance Academic + PoRs",
            description: "Good grades, strong PoRs, and well-rounded experience matter."
        }
    ]
};

const DOMAIN_LIST = Object.keys(DOMAIN_TIPS);

export default function DomainCVPrepGuide() {
    const [activeDomain, setActiveDomain] = useState("Consulting");

    const tips = DOMAIN_TIPS[activeDomain];

    return (
        <section className="max-w-4xl mx-auto px-6 py-10 text-white">
            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <SparklesIcon className="w-7 h-7 text-cyan-400" />
                    Domain-wise CV Preparation Guide
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Choose a domain to see customized tips for CV building.
                </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {DOMAIN_LIST.map((domain) => (
                    <button
                        key={domain}
                        onClick={() => setActiveDomain(domain)}
                        className={`px-4 py-2 text-sm rounded-full font-medium transition ${activeDomain === domain
                                ? "bg-cyan-600 text-white"
                                : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                            }`}
                    >
                        {domain}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {tips.map((tip, i) => (
                    <motion.div
                        key={i}
                        className="bg-gray-900 p-5 rounded-xl shadow-md border border-gray-700"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <h3 className="text-lg font-semibold mb-1">{tip.title}</h3>
                        <p className="text-sm text-gray-300">{tip.description}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
