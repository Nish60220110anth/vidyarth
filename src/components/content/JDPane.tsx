import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { DOMAIN_COLORS } from "../ManageCompanyList";
import { saveAs } from "file-saver";
import axios from "axios";
import { JDEntry, JDPaneProps } from "@/types/panes";
import { baseUrl } from "@/lib/config";
import { useState } from "react";

const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

const JDPane: React.FC<JDPaneProps> = ({ props }) => {
    const { jds } = props;
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

    const getExt = (name?: string) => name?.split(".").pop()?.toLowerCase() || "pdf";
    const getKey = (jd: Partial<JDEntry>) => `${jd.jd_pdf_path || ""}`;

    const handleDownload = async (jd: Partial<JDEntry>) => {
        if (!jd.jd_pdf_path) {
            toast.error("File path is missing");
            return;
        }

        const fallbackName = `${jd.company}_${jd.role}(${jd.cycle_type}_${jd.year}).${getExt(jd.jd_pdf_name)}`;
        setDownloadingKey(getKey(jd));

        try {
            const url = `${baseUrl}/api/proxy-file?url=${encodeURIComponent(jd.jd_pdf_path)}`;
            const res = await axios.get(url, { responseType: "blob", validateStatus: () => true });
            const ctype = String(res.headers?.["content-type"] || "");
            if (res.status !== 200 || ctype.includes("application/json")) {
                const text = await res.data.text();
                let err = "Failed to download the file";
                try {
                    const j = JSON.parse(text);
                    err = j?.error || err;
                } catch { }
                toast.error(err);
                return;
            }

            const disp = String(res.headers?.["content-disposition"] || "");
            const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(disp);
            const serverName = match ? decodeURIComponent(match[1]) : null;
            saveAs(res.data, serverName || fallbackName);
            toast.success("Download started");
        } catch {
            toast.error("Failed to download the file");
        } finally {
            setDownloadingKey(null);
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

    const sorted = [...jds].sort((a, b) => Number(!!b.is_current) - Number(!!a.is_current));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4">
            {sorted.map((jd, idx) => {
                const ext = getExt(jd.jd_pdf_name);
                const isCurrent = !!jd.is_current;
                const isDownloading = downloadingKey === getKey(jd);
                const cardBase = "relative rounded-xl transition-all duration-200 backdrop-blur-md overflow-hidden border hover:-translate-y-0.5";
                const currentSurface = "bg-gradient-to-br from-[#091520] via-[#0b1d2a] to-[#0f2230] border-cyan-500/50";
                const oldSurface = "bg-gradient-to-br from-[#0b1118] via-[#0c121a] to-[#0d141d] border-cyan-900/30 hover:border-cyan-700/40";
                const fileBadgeClass = ext === "pdf" ? "bg-red-600/90" : "bg-blue-600/90";

                return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.22, ease: "easeOut" }}
                        viewport={{ once: true, amount: 0.2 }}
                        className={cn(cardBase, isCurrent ? currentSurface : oldSurface)}
                    >
                        {isCurrent && (
                            <div className="absolute right-2 top-2 z-10">
                                <span className="inline-flex items-center rounded-md bg-cyan-600/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-200 ring-1 ring-inset ring-cyan-500/40">
                                    CURRENT
                                </span>
                            </div>
                        )}

                        <div className="p-5">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-base font-semibold text-white truncate pr-8">{jd.company}</h3>
                            </div>

                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <p className="text-sm text-gray-300 truncate" title={jd.role}>
                                    {jd.role}
                                </p>
                                {jd.domains?.length ? <span className="text-cyan-700">•</span> : null}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {jd.domains?.map((domain, i) => {
                                        const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS["Others"];
                                        return (
                                            <span key={i} className={cn(color.bg, color.text, "px-2 py-0.5 rounded-full text-[11px] leading-tight")}>
                                                {domain}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <span className={cn("px-2 py-0.5 rounded-full text-xs", isCurrent ? "bg-cyan-700 text-cyan-50" : "bg-[#112531] text-cyan-200 border border-cyan-800/40")}>
                                    {jd.cycle_type} {jd.year}
                                </span>

                                <span className={cn("text-white text-[10px] px-2 py-0.5 rounded-full", fileBadgeClass)} title={ext.toUpperCase()}>
                                    {ext.toUpperCase()}
                                </span>
                            </div>

                            <button
                                onClick={() => handleDownload(jd)}
                                disabled={isDownloading}
                                aria-busy={isDownloading}
                                className={cn(
                                    "mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md border focus:outline-none focus-visible:ring-2",
                                    isCurrent ? "border-cyan-500/60 bg-cyan-900 text-white hover:bg-cyan-800 focus-visible:ring-cyan-500" : "border-cyan-800/40 bg-[#0d1b24] text-white hover:bg-[#10202b] focus-visible:ring-cyan-600",
                                    isDownloading && "opacity-70 cursor-not-allowed"
                                )}
                                aria-label={`Download JD for ${jd.company} - ${jd.role}`}
                                title="Download JD"
                            >
                                {isDownloading ? (
                                    <span className="h-4 w-4 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin" />
                                ) : (
                                    <ArrowDownTrayIcon className="w-4 h-4 text-cyan-300" />
                                )}
                                {isDownloading ? "Preparing…" : "Download JD"}
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default JDPane;
