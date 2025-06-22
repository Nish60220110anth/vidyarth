
import { motion } from "framer-motion";
import { SparklesIcon } from "@heroicons/react/24/outline";

const tips = [
    {
        title: "1. Keep it One Page",
        description: "A campus CV should ideally be a single page. Prioritize impact over length."
    },
    {
        title: "2. Use Bullet Points with Action Words",
        description: "Start each point with a strong verb like 'Led', 'Created', 'Optimized', 'Improved'."
    },
    {
        title: "3. Focus on Outcomes",
        description: "Always quantify impact. E.g., 'Increased efficiency by 20%', 'Reduced costs by ₹50K'."
    },
    {
        title: "4. Follow a Clear Structure",
        description: "Suggested order: Education → Work Ex → PoRs → Achievements → Skills."
    },
    {
        title: "5. Avoid Generic Phrases",
        description: "Avoid vague lines like 'Worked hard' or 'Team player'. Be specific and unique."
    },
    {
        title: "6. Tailor for Roles",
        description: "For consulting, emphasize structured impact. For tech, show projects. For finance, highlight analysis and tools."
    },
    {
        title: "7. Maintain Visual Cleanliness",
        description: "Avoid colors, photos, or unusual fonts. Stick to clean formatting with equal spacing."
    },
    {
        title: "8. Review & Peer Feedback",
        description: "Get at least 2-3 rounds of feedback from seniors or friends. Typos are not okay."
    }
];

export default function HowToPrepareCV() {
    return (
        <section className="max-w-3xl mx-auto px-6 py-10">
            <div className="text-white mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <SparklesIcon className="w-7 h-7 text-cyan-400" />
                    How to Prepare Your CV
                </h1>
                <p className="text-gray-400 mt-2 text-sm">
                    These are essential tips for creating a high-impact CV during placements at IIMs or other B-Schools.
                </p>
            </div>

            <div className="space-y-6">
                {tips.map((tip, i) => (
                    <motion.div
                        key={i}
                        className="bg-gray-900 text-white p-5 rounded-xl shadow-md border border-gray-700"
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
