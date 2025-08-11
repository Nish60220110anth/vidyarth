import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ACCESS_PERMISSION, DOMAIN, student_cv } from '@prisma/client';
import axios from 'axios';
import toast from 'react-hot-toast';
import { toTitleCase } from './Profile';
import { fetchCVFile, fetchCVForUserID, putStudentCV } from '@/lib/api/studentCV';
import { useRouter } from 'next/router';
import { baseUrl } from '@/lib/config';

type Props = {
    name: string;
    email: string;
    role: string;
    id: number;
};

type CVEntryProp = {
    comment?: string,
    domain?: string
}

type CVEntry = student_cv;

export default function MyCV({ id, name }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [cvs, setCvs] = useState<CVEntry[]>([]);
    const [editing, setEditing] = useState<number | null>(null);

    const [originalData, setOriginalData] = useState<{ [key: number]: CVEntryProp }>({});
    const [currentData, setCurrentData] = useState<{ [key: number]: CVEntryProp }>({});

    useEffect(() => {
        const fetchCVs = async () => {
            setLoading(true);
            try {
                const fetchedCVs = await fetchCVForUserID(id);
                setCvs(fetchedCVs);

                const initialOriginalData: typeof originalData = {};
                fetchedCVs.forEach((cv: CVEntry) => {
                    initialOriginalData[cv.id] = {
                        comment: cv.comment || undefined,
                        domain: cv.domain || undefined
                    };
                });

                setOriginalData(initialOriginalData);
                setCurrentData(initialOriginalData);

            } catch (err: any) {
                toast.error(err.message || 'Failed to fetch CVs');
            } finally {
                setLoading(false);
            }
        };

        fetchCVs();
    }, [id, router.isReady]);

    const handleDownload = async (cv: CVEntry) => {
        try {

            const url = await fetchCVFile(cv.cv_path);
            const a = document.createElement('a');
            a.href = url;
            a.download = cv.cv_filename;
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download failed:', error);
            toast.error("Couldn't download CV")
            return;
        }
    };

    const handleGenericDownload = () => {
        const url = `${baseUrl}/generic/John Doe CV.docx`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `${toTitleCase(name)}_John_CV.docx`;
        a.click();
    };

    const primaryCV = cvs.find((cv) => cv.is_primary);
    const otherCVs = cvs.filter((cv) => !cv.is_primary);

    const handleEdit = (cv_id: number) => {
        setEditing(cv_id);

        const original = originalData[cv_id];

        if (original) {
            setCurrentData((prev) => ({
                ...prev,
                [cv_id]: { comment: original.comment || undefined, domain: original.domain || undefined }
            }));
        } else {
            const cv = cvs.find((cv) => cv.id === cv_id);
            if (cv) {
                setCurrentData((prev) => ({
                    ...prev,
                    [cv_id]: { comment: cv.comment || undefined, domain: cv.domain || undefined }
                }));
            }
        }
    };


    const handleSave = async (cv_id: number) => {
        try {
            putStudentCV(cv_id, currentData[cv_id].domain, currentData[cv_id].comment);
            setEditing(null);
            setOriginalData((prev) => ({
                ...prev,
                [cv_id]: {
                    comment: currentData[cv_id]?.comment || undefined,
                    domain: currentData[cv_id]?.domain || undefined
                }
            }));

        } catch (error) {
            toast.error('Error while saving CV data');
            return;
        }
    };

    const handleCancel = (cv_id: number) => {
        setEditing(null);
        setCurrentData((prev) => ({
            ...prev,
            [cv_id]: originalData[cv_id] || { comment: undefined, domain: undefined }
        }));
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>, cv_id: number) => {
        setCurrentData((prev) => ({
            ...prev,
            [cv_id]: { ...prev[cv_id], comment: e.target.value }
        }));
    };

    const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>, cv_id: number) => {
        setCurrentData((prev) => ({
            ...prev,
            [cv_id]: { ...prev[cv_id], domain: e.target.value }
        }));
    };

    return (
        <div className="p-6 mx-auto bg-gradient-to-b from-gray-950 to-gray-900 min-h-screen text-white font-[Urbanist] max-w-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">My CVs</h2>
                <button
                    onClick={handleGenericDownload}
                    className="flex items-center px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
                >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Download John Doe CV
                </button>
            </div>

            {loading ? (
                <p className="text-cyan-300 italic">Loading CVs...</p>
            ) : cvs.length === 0 ? (
                <p className="text-cyan-600 italic">No CVs found.</p>
            ) : (
                <div className="space-y-6">
                    {(primaryCV || otherCVs.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {primaryCV && (
                                <motion.div
                                    key={primaryCV.id}
                                    className="p-4 bg-gray-900 border border-gray-800 rounded-2xl shadow col-span-1"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <h3 className="text-lg font-semibold text-green-400 mb-2">Primary CV</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <DocumentTextIcon className="h-6 w-6 text-cyan-400" />
                                            <div>
                                                <p className="font-semibold text-white">{primaryCV.cv_filename}</p>
                                                {primaryCV.comment && (
                                                    <p className="text-sm text-cyan-300">{primaryCV.comment}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(primaryCV)}
                                            className="flex items-center px-3 py-1.5 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                                        >
                                            <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
                                            Download
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {otherCVs.map((cv) => (
                                <motion.div
                                    key={cv.id}
                                    className="flex flex-col justify-between p-4 bg-gray-900 border border-gray-800 rounded-2xl shadow"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-center space-x-3 mb-3">
                                        <DocumentTextIcon className="h-6 w-6 text-cyan-400" />
                                        <div>
                                            <p className="font-semibold text-white">{cv.cv_filename}</p>
                                        </div>
                                    </div>

                                    {editing === cv.id ? (
                                        <div className="flex flex-col gap-3">
                                            <select
                                                value={currentData[cv.id]?.domain || ''}
                                                onChange={(e) => handleDomainChange(e, cv.id)}
                                                className="p-2 bg-gray-800 text-white rounded border border-gray-700"
                                            >
                                                <option value="">Select Domain</option>
                                                {Object.keys(DOMAIN).map((d) => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={currentData[cv.id]?.comment || ''}
                                                onChange={(e) => handleCommentChange(e, (cv.id))}
                                                placeholder="Add a comment"
                                                className="p-2 bg-gray-800 text-white rounded border border-gray-700"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSave((cv.id))}
                                                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => handleCancel((cv.id))}
                                                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 text-sm text-gray-300">
                                            <div className="flex items-start gap-2">
                                                <span className="text-gray-400 font-medium min-w-[60px]">Domain:</span>
                                                <span className="text-cyan-300">
                                                    {currentData[cv.id]?.domain ? toTitleCase(currentData[cv.id]?.domain || "") : (
                                                        <span className="italic text-gray-500">Not specified</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-gray-400 font-medium min-w-[60px]">Comment:</span>
                                                <span className="text-cyan-300">
                                                    {currentData[cv.id]?.comment ? currentData[cv.id]?.comment : (
                                                        <span className="italic text-gray-500">No comment</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => handleEdit((cv.id))}
                                                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(cv)}
                                                    className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
                                                >
                                                    <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
                                                    Download
                                                </button>
                                            </div>
                                        </div>

                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
