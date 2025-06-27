import { JDEntry } from "../Company";
import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { DOMAIN_COLORS } from "../ManageCompanyList";
import saveAs from "file-saver";
import axios from "axios";

interface JDPaneProps {
    jds: Partial<JDEntry>[];
}

const JDPane: React.FC<JDPaneProps> = ({ jds }) => {
    
    const handleDownload = async (jd: Partial<JDEntry>) => {
        if (!jd.jd_pdf_path) {
            toast.error("File path is missing");
            return;
        }

        const extension = jd.jd_pdf_path.split(".").pop()?.toLowerCase() || "pdf";
        const filename = `${jd.company}_${jd.role}(${jd.cycle_type}_${jd.year}).${extension}`;

        try {
            const proxyURL = `/api/proxy-file?url=${encodeURIComponent(jd.jd_pdf_path)}`;
            const response = await axios.get(proxyURL, { responseType: "blob" });

            saveAs(response.data, filename);
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download the file");
        }
    };

    if (!jds?.length) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-10 rounded-xl border border-blue-900 bg-gradient-to-b from-[#0d1b24] to-[#0a141d] shadow-md">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#112531] border border-blue-800 mb-4">
                    <DocumentTextIcon className="w-7 h-7 text-cyan-400" />
                </div>
                <p className="text-base font-semibold text-cyan-200">No Job Descriptions Yet</p>
                <p className="text-sm text-gray-400 mt-1">Stay tuned — new JDs will appear here soon.</p>
            </div>

        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4">
            {jds.map((jd, idx) => {
                const ext = jd.jd_pdf_path?.split(".").pop()?.toLowerCase() || "pdf";
                const badgeColor = ext === "pdf" ? "bg-red-600" : "bg-blue-600";

                return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.3, ease: "easeIn" }}
                        whileHover={{ scale: 1.015, boxShadow: "0 0 0.8rem rgba(0,255,255,0.2)" }}
                        viewport={{ once: true, amount: 0.2 }}
                        className="bg-gradient-to-br from-[#0a0f1a]/90 via-[#0e1523]/80 to-[#111827]/80 
           border border-cyan-900/30 rounded-xl shadow-xl transition-all duration-300 
           hover:shadow-cyan-800/20 backdrop-blur-md bg-blue-950 p-5 hover:shadow-xl relative"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold text-white truncate">{jd.company}</h3>
                            <span className={`text-white text-[10px] px-2 py-0.5 rounded-full ${badgeColor}`}>
                                {ext.toUpperCase()}
                            </span>
                        </div>

                        <p className="text-sm text-gray-300 truncate" title={jd.role}>
                            {jd.role}
                        </p>

                        {jd.domains?.map((domain, i) => {
                            const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS["Others"];
                            return (
                                <span
                                    key={i}
                                    className={`${color.bg} ${color.text} px-2 py-0.5 mr-2 rounded-full text-[11px]`}
                                >
                                    {domain}
                                </span>
                            );
                        })}


                        <div className="mt-2 text-xs text-cyan-300">
                            <span className="bg-cyan-700 text-cyan-100 px-2 py-0.5 rounded-full">
                                {jd.cycle_type} {jd.year}
                            </span>
                        </div>

                        <button
                            onClick={() => handleDownload(jd)}
                            className="mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md border border-blue-900 bg-cyan-950 text-white hover:bg-cyan-900 hover:shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4 text-cyan-300" />
                            Download JD
                        </button>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default JDPane;
