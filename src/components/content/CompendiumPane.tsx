
import { fetchSession, SessionInfo } from "@/utils/api";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "../RichTextPane";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { CompendiumEntry } from "@/types/panes";
import { DocumentArrowUpIcon, EyeIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";

export default function Compendium({ props }: { props: CompendiumEntry }) {
    const isMobile = useIsMobile();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [originalValue, setOriginalValue] = useState<{
        content: string;
        pdfs: { id: number; compendimum_id: number; pdf_name: string; pdf_path: string; firebase_path: string }[];
    }>({
        content: "",
        pdfs: [],
    });

    const [content, setContent] = useState<string>("");

    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // this is new files list 
    const [uploadedNames, setUploadedNames] = useState<string[]>([]);
    const [deletedPdfs, setDeletedPdfs] = useState<number[]>([]); // this is deleted pdf ids

    const [isEditing, setIsEditing] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadPercent, setUploadPercent] = useState<number>(0);
    const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
    const [uploadMode, setUploadMode] = useState<"uploading" | "deleting" | "done">("done");


    const fileInputRef = useRef<HTMLInputElement>(null);
    const visiblePDFs = originalValue.pdfs.filter((pdf) => !deletedPdfs.includes(pdf.id));

    const loadSession = async () => {
        const data = await fetchSession();
        if (!data.success) {
            toast.error("Failed to load session");
            return;
        }
        setSession(data.data);
    };

    const fetchPermissions = async () => {
        const res = await axios.get(`/api/permissions`);
        setPermissions(res.data.permissions);
    };

    const fetchCompendium = async (company_id: number) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/compendium`, {
                params: { cid: company_id },
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                }
            });

            if (!res.data.success) {
                toast.error(res.data.error || "Failed to fetch compendium");
                return;
            }

            setContent(res.data.content);
            setOriginalValue({
                content: res.data.content,
                pdfs: res.data.pdfs,
            });

            setUploadedFiles([]);
            setUploadedNames([]);

            setLoading(false);
        } catch (err) {
            toast.error("Failed to load compendium");
        }
    };

    const saveCompendium = async () => {

        if (
            uploadedFiles.length === 0 &&
            deletedPdfs.length === 0 &&
            content === originalValue.content
        ) {
            toast("No changes made");
            return { success: undefined };
        }

        setIsUploading(true);
        setUploadPercent(0);
        setCurrentFileIndex(0);

        const company_id = props.company_id;

        if (deletedPdfs.length > 0) {
            setUploadMode("deleting");

            const baseFormData = new FormData();
            baseFormData.append("cid", company_id.toString());
            baseFormData.append("content", content);
            baseFormData.append("total_new_entries", "0");
            baseFormData.append("total_deleted_entries", deletedPdfs.length.toString());
            deletedPdfs.forEach((id, i) => {
                baseFormData.append(`pdf_deleted_id_${i + 1}`, id.toString());
            });

            try {
                await axios.put("/api/compendium", baseFormData, {
                    headers: {
                        "x-access-permission": ACCESS_PERMISSION.MANAGE_MY_COHORT
                    }
                });
            } catch (err: any) {
                toast.error("Failed to delete PDFs or save content");
                setIsUploading(false);
                setUploadMode("done");
                return { success: false, error: err.message };
            }
        }

        if (uploadedFiles.length >= 0) {
            setUploadMode("uploading");

            for (let i = 0; i < Math.max(uploadedFiles.length, 1); i++) {
                setCurrentFileIndex(i);

                const formData = new FormData();
                formData.append("cid", company_id.toString());
                formData.append("content", content);
                formData.append("total_new_entries", uploadedFiles.length ? "1" : "0");
                formData.append("pdf_new_file_1", uploadedFiles[i]);
                formData.append("pdf_new_name_1", uploadedNames[i]);
                formData.append("total_deleted_entries", "0");

                try {
                    await axios.put("/api/compendium", formData, {
                        headers: {
                            "Content-Type": "multipart/form-data",
                            "x-access-permission": ACCESS_PERMISSION.MANAGE_MY_COHORT
                        },
                        onUploadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const percent = Math.round(
                                    (progressEvent.loaded * 100) / progressEvent.total
                                );
                                // setUploadPercent(percent);
                                const totalFiles = uploadedFiles.length;
                                const percentOverall = Math.round(((i + percent / 100) / totalFiles) * 100);
                                setUploadPercent(percentOverall);
                            }
                        },
                    });
                } catch (err: any) {
                    toast.error(`Upload failed for ${uploadedNames[i]}`);
                    setIsUploading(false);
                    setUploadMode("done");
                    return { success: false, error: err.message };
                }
            }
        }

        setUploadPercent(100);
        setUploadMode("done");
        setTimeout(() => setIsUploading(false), 500);
        return { success: true };
    };

    const allDeleted = originalValue.pdfs.every((pdf) =>
        deletedPdfs.includes(pdf.id)
    );

    const deletePdf = async (compendPdfId?: number, name?: string) => {

        if (name && uploadedNames.includes(name)) {
            const index = uploadedNames.indexOf(name);
            setUploadedNames(uploadedNames.filter((_, i) => i !== index));
            setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
        } else if (compendPdfId && originalValue.pdfs.some((pdf) => pdf.id === compendPdfId)) {
            setDeletedPdfs([...deletedPdfs, compendPdfId]);
        } else {
            console.error("Invalid pdf id or name");
            return;
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            Promise.all([loadSession(), fetchPermissions(), fetchCompendium(props.company_id)])
                .finally(() => setLoading(false));
        };
        init();
    }, []);

    const isEditor =
        session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[150px] bg-gray-50 border border-cyan-100 rounded-md text-sm text-cyan-600 font-medium gap-2 px-4 py-3 shadow-sm">
                <svg
                    className="w-4 h-4 animate-spin text-cyan-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v4m0 8v4m8-8h4M4 12H0m16.24-6.24l2.83 2.83M4.93 19.07l2.83-2.83M19.07 19.07l-2.83-2.83M4.93 4.93l2.83 2.83"
                    />
                </svg>
                Loading content...
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-[150px] bg-red-50 border border-red-200 rounded-md text-sm text-red-600 font-medium gap-2 px-4 py-3 shadow-sm">
                <svg
                    className="w-4 h-4 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
                    />
                </svg>
                Unable to load content. Please try again.
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3 w-full items-start">
            {/* Left: Overview Editor */}
            <div className="w-full sm:flex-1 min-w-0 rounded-xl bg-white border 
            border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-2 sm:px-2 py-3 space-y-4 ring-1 ring-inset 
            ring-gray-100 backdrop-blur-sm transition-all duration-300 ease-in-out">
                {isEditor && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="col-span-full flex flex-col sm:flex-row justify-end items-start sm:items-center border-b border-gray-300 pb-3 gap-2"
                    >
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full sm:w-auto px-4 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 hover:shadow-sm active:scale-95 transition-all"
                            >
                                Edit
                            </button>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        setIsEditing(false);

                                        if (uploadedFiles.length > 0) {
                                            setUploadedFiles([]);
                                            setUploadedNames([]);
                                        }

                                        if (deletedPdfs.length > 0) {
                                            setDeletedPdfs([]);
                                        }

                                        if (content !== originalValue.content) {
                                            setContent(originalValue.content);
                                        }
                                    }}
                                    className="px-4 py-1.5 text-sm rounded-md border border-red-200 text-red-600
                                     hover:bg-red-50 hover:shadow-sm active:scale-95 transition-all w-full sm:w-auto"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        const result = await saveCompendium();

                                        if (result?.success === true) {
                                            await fetchCompendium(props.company_id);
                                            setUploadedFiles([]);
                                            setUploadedNames([]);
                                            setDeletedPdfs([]);
                                        } else if (result?.success === false) {
                                            toast.error(result.error || "Failed to save compendium");
                                        }

                                        setIsEditing(false);
                                    }}
                                    className="px-4 py-1.5 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-700 
                                    hover:shadow-md active:scale-95 transition-all w-full sm:w-auto"
                                >
                                    Save
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-lg bg-gray-50 border border-gray-200 p-3"
                >
                    <RichTextPane
                        editable={isEditing}
                        lexicalState={
                            !isEditing
                                ? isMobile
                                    ? convertListsToParagraphs(content)
                                    : content
                                : undefined
                        }
                        OnSetContent={(f: string) => {
                            setContent(f);
                        }}
                        placeholder={isEditor ? "Enter content here..." : "Content not available yet"}
                    />
                </motion.div>
            </div>

            {/* Right: PDF Upload Panel */}
            <div className="w-full sm:w-80 bg-white border border-gray-300 rounded-xl shadow relative overflow-hidden">
                {/* Floating Action Bar */}
                {isEditing && (
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between gap-2 px-4 py-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-lg hover:bg-cyan-50 transition group w-full sm:w-auto"
                            title="Upload PDF"
                        >
                            <PlusIcon className="w-5 h-5 text-cyan-600 group-hover:scale-110 group-hover:text-cyan-800 transition-transform" />
                        </button>
                        <button
                            disabled={allDeleted}
                            onClick={() => {
                                const remainingIds = originalValue.pdfs
                                    .filter((pdf) => !deletedPdfs.includes(pdf.id))
                                    .map((pdf) => pdf.id);
                                setDeletedPdfs((prev) => [...prev, ...remainingIds]);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 transition group w-full sm:w-auto"
                            title="Delete All PDFs"
                        >
                            <TrashIcon className="w-5 h-5 text-red-500 group-hover:scale-110 group-hover:text-red-700 transition-transform" />
                        </button>
                        <input
                            type="file"
                            accept="application/pdf"
                            ref={fileInputRef}
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                const newFiles = Array.from(e.target.files || []);
                                const getBaseName = (name: string) => name.replace(/\.pdf$/i, "");
                                setUploadedFiles((prev) => [...prev, ...newFiles]);
                                setUploadedNames((prev) => [
                                    ...prev,
                                    ...newFiles.map((f) => getBaseName(f.name)),
                                ]);
                            }}
                        />
                    </div>
                )}

                {/* Header */}
                <div className="px-4 pt-4 pb-2 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                </div>

                {/* Scrollable PDF List */}
                <div className="space-y-2 max-h-[300px] px-4 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-500">
                    {visiblePDFs.length === 0 && uploadedFiles.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-gray-400 text-sm text-center py-8">
                            <DocumentArrowUpIcon className="w-8 h-8 mb-2" />
                            <p>No documents available.</p>
                        </div>
                    )}

                    {/* Existing PDFs */}
                    {originalValue.pdfs.map((pdf) => {
                        const isDeleted = deletedPdfs.includes(pdf.id);
                        return (
                            <div
                                key={pdf.id}
                                className={`flex justify-between items-center px-3 py-2 rounded-md text-sm transition group 
            ${isDeleted
                                        ? "bg-red-50 border border-red-200 text-red-400 line-through"
                                        : "bg-gray-50 text-gray-800 hover:shadow"
                                    }`}
                            >
                                <span className="truncate w-4/5">{pdf.pdf_name}</span>
                                <div className="flex gap-2 items-center">
                                    {!isDeleted && (
                                        <EyeIcon
                                            onClick={() => window.open(pdf.pdf_path, "_blank")}
                                            className="w-5 h-5 text-cyan-600 hover:text-cyan-800 hover:scale-110 transition-transform cursor-pointer"
                                            title="Preview PDF"
                                        />
                                    )}
                                    {isEditing && (
                                        <TrashIcon
                                            onClick={() => deletePdf(pdf.id)}
                                            className={`w-5 h-5 hover:scale-110 transition-transform cursor-pointer ${isDeleted
                                                ? "text-gray-400"
                                                : "text-red-500 hover:text-red-700"
                                                }`}
                                            title="Delete PDF"
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* New Uploads */}
                    {isEditing &&
                        uploadedFiles.map((f, idx) => (
                            <div
                                key={idx}
                                className="flex justify-between items-center px-3 py-2 rounded-md bg-cyan-50 text-cyan-900 border border-cyan-200 text-xs transition group"
                            >
                                <span className="truncate w-4/5">{f.name.replace(".pdf", "")}</span>
                                <TrashIcon
                                    onClick={() => deletePdf(undefined, f.name.replace(".pdf", ""))}
                                    className="w-4 h-4 text-red-500 hover:text-red-700 hover:scale-110 transition-transform 
                                    cursor-pointer"
                                    title="Remove this file"
                                />
                            </div>
                        ))}
                </div>
            </div>


            {isUploading && (
                <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-center px-6">
                    <div className="relative w-16 h-16 mb-4">
                        {!(uploadMode === "deleting") ? (
                            <div
                                className="absolute inset-0 rounded-full animate-spin"
                                style={{
                                    background: `conic-gradient(rgba(0,255,255,0.9) ${uploadPercent}%, rgba(0,255,255,0.1) ${uploadPercent}%)`,
                                    maskImage: 'radial-gradient(circle at center, transparent 65%, black 66%)',
                                    WebkitMaskImage: 'radial-gradient(circle at center, transparent 60%, black 60%)',
                                    boxShadow: '0 0 12px rgba(0,255,255,0.5)',
                                }}
                            />
                        ) : (
                            <div
                                className="absolute inset-1.5 rounded-full border-[3px] border-red-400 animate-spin"
                                style={{
                                    boxShadow: '0 0 10px rgba(255, 100, 100, 0.5)',
                                }}
                            />
                        )}
                    </div>

                    {/* Status text */}
                    {uploadMode === "uploading" ? (
                        <>
                            <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">
                                Uploading file {currentFileIndex + 1} of {uploadedFiles.length}
                            </p>
                            <p className="text-cyan-300 text-sm">{uploadPercent}% completed</p>
                        </>
                    ) : uploadMode === "deleting" && uploadedFiles.length === 0 ? (
                        <>
                            <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">
                                Deleting {deletedPdfs.length} file{deletedPdfs.length > 1 ? "s" : ""}...
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">
                                Finalizing...
                            </p>
                        </>
                    )}
                </div>

            )}
        </div>
    );

}
