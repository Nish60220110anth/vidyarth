
import { motion } from "framer-motion";
import { CpuChipIcon } from "@heroicons/react/24/outline";

const STEPS = [
    {
        title: "1. Upload Your CV",
        description:
            "Start by uploading your latest 1-page campus CV in PDF format. The AI uses this to generate questions."
    },
    {
        title: "2. Select Domain",
        description:
            "Choose the domain you’re preparing for (e.g., Consulting, Finance, ProdMan). This helps tailor the interview questions."
    },
    {
        title: "3. Start Mock Interview",
        description:
            "You’ll receive one question at a time. Respond in a conversational format. You can also ask for hints or feedback."
    },
    {
        title: "4. Get Instant Feedback",
        description:
            "The AI will highlight strengths, flag vague points, and offer improvement suggestions after every 1–2 questions."
    },
    {
        title: "5. Review Summary",
        description:
            "Once the session ends, you'll get a performance summary with scores and specific tips to improve your answers."
    }
];

export default function AIMock() {
    return (
        <section className="max-w-3xl mx-auto px-6 py-10 text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <CpuChipIcon className="w-7 h-7 text-cyan-400" />
                    How to Use AI Mock Interviews
                </h1>
                <p className="text-gray-400 text-sm mt-2">
                    Get interview-ready with our AI-powered bot that tailors questions to your CV and domain. Here's how it works:
                </p>
            </div>

            <div className="space-y-5">
                {STEPS.map((step, i) => (
                    <motion.div
                        key={i}
                        className="bg-gray-900 p-5 rounded-xl border border-gray-700 shadow-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        <p className="text-sm text-gray-300 mt-1">{step.description}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
