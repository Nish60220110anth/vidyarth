import { motion } from "framer-motion";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

interface NewsItem {
    id: number;
    title: string;
    summary: string;
    created_at: string;
    domain: string;
}

const sampleNews: NewsItem[] = [
    {
        id: 1,
        title: "McKinsey to Hire from IIML 2025 Batch",
        summary: "McKinsey & Co. is expected to offer full-time roles in strategy and operations.",
        created_at: "2025-06-17T09:00:00Z",
        domain: "Consulting"
    },
    {
        id: 2,
        title: "JP Morgan Offers 18 LPA for Finance Roles",
        summary: "JP Morgan's investment banking division has released final placement offers.",
        created_at: "2025-06-16T18:30:00Z",
        domain: "Finance"
    },
    {
        id: 3,
        title: "Amazon Opens SDE Internship for Summer '26",
        summary: "Amazon is accepting applications for its 2026 SDE internship with WFH option.",
        created_at: "2025-06-15T13:00:00Z",
        domain: "ProdMan"
    },
    {
        id: 4,
        title: "P&G Looking for Marketing Interns",
        summary: "P&G's brand team will visit campus in August for intern selections.",
        created_at: "2025-06-14T08:15:00Z",
        domain: "Marketing"
    }
];

export default function LatestNews() {
    return (
        <section className="w-full max-w-4xl mx-auto px-4 py-10">
            <h2 className="text-2xl font-bold text-white mb-6">📰 Latest News</h2>

            <div className="space-y-4">
                {sampleNews.map((item) => (
                    <motion.div
                        key={item.id}
                        className="bg-gray-900 text-white p-5 rounded-xl shadow-md hover:shadow-xl transition-shadow"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: item.id * 0.08 }}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold">{item.title}</h3>
                                <p className="text-sm text-gray-400 mt-1">{item.summary}</p>
                                <span className="inline-block mt-2 text-xs text-cyan-400 font-medium px-2 py-1 bg-cyan-900 rounded-full">
                                    {item.domain}
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <CalendarDaysIcon className="w-4 h-4" />
                                {new Date(item.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
