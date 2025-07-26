import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ACCESS_PERMISSION, DOMAIN, student_cv } from '@prisma/client';
import axios from 'axios';
import toast from 'react-hot-toast';
import { toTitleCase } from './Profile';

type Props = {
    name: string;
    email: string;
    role: string;
    id: number;
};

type CVEntry = student_cv;

export default function MyCV({ id, name }: Props) {
    const [loading, setLoading] = useState(true);
    const [cvs, setCvs] = useState<CVEntry[]>([]);

    const [editing, setEditing] = useState<string | null>(null);

    const [originalData, setOriginalData] = useState<{ [key: string]: { comment: string, domain: string } }>({});
    const [currentData, setCurrentData] = useState<{ [key: string]: { comment: string, domain: string } }>({});

    useEffect(() => {
        const fetchCVs = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/cv/?userid=${id}`, {
                    headers: {
                        'x-access-permission': ACCESS_PERMISSION.ENABLE_MY_CV
                    }
                });

                if (!res.data.success) {
                    toast.error(res.data.error);
                    return;
                }

                const fetchedCVs = res.data.cvs || [];
                setCvs(fetchedCVs);

                const initialOriginalData: { [key: string]: { comment: string, domain: string } } = {};
                fetchedCVs.forEach((cv: CVEntry) => {
                    initialOriginalData[cv.id] = {
                        comment: cv.comment || '',
                        domain: cv.domain || ''
                    };
                });
                setOriginalData(initialOriginalData);

                const editedOriginalData: { [key: string]: { comment: string, domain: string } } = {};
                fetchedCVs.forEach((cv: CVEntry) => {
                    initialOriginalData[cv.id] = {
                        comment: cv.comment || '',
                        domain: cv.domain || ''
                    };
                });
                setCurrentData(editedOriginalData);
            } catch (err: any) {
                toast.error(err.message || 'Failed to fetch CVs');
            } finally {
                setLoading(false);
            }
        };

        fetchCVs();
    }, [id]);

    const handleDownload = async (cv: CVEntry) => {
        try {
            const res = await fetch(`/api/cv/fetch?file=${encodeURIComponent(cv.cv_path)}`, {
                headers: {
                    'x-access-permission': ACCESS_PERMISSION.ENABLE_MY_CV
                }
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = cv.cv_filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const handleGenericDownload = () => {
        const url = '/generic/John Doe CV.docx';
        const a = document.createElement('a');
        a.href = url;
        a.download = `${toTitleCase(name)}_John_CV.docx`;
        a.click();
    };

    const primaryCV = cvs.find((cv) => cv.is_primary);
    const otherCVs = cvs.filter((cv) => !cv.is_primary);

    const handleEdit = (cvId: string) => {
        setEditing(cvId);

        const original = originalData[cvId];

        if (original) {
            setCurrentData((prev) => ({
                ...prev,
                [cvId]: { comment: original.comment || '', domain: original.domain || '' }
            }));
        } else {
            const cv = cvs.find((cv) => String(cv.id) === cvId);
            if (cv) {
                setCurrentData((prev) => ({
                    ...prev,
                    [cvId]: { comment: cv.comment || '', domain: cv.domain || '' }
                }));
            }
        }
    };


    const handleSave = async (cvId: string) => {
        try {
            const res = await axios.put(`/api/cv`, {
                cv_id: cvId,
                comment: currentData[cvId]?.comment,
                domain: currentData[cvId]?.domain
            }, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_MY_CV
                }
            });
            if (res.data.success) {
                setEditing(null);

                setOriginalData((prev) => ({
                    ...prev,
                    [cvId]: {
                        comment: currentData[cvId]?.comment || '',
                        domain: currentData[cvId]?.domain || ''
                    }
                }));

            } else {
                toast.error('Failed to update CV');
            }
        } catch (error) {
            toast.error('Error while saving CV');
        }
    };

    const handleCancel = (cvId: string) => {
        setEditing(null);
        setCurrentData((prev) => ({
            ...prev,
            [cvId]: originalData[cvId] || { comment: '', domain: '' }
        }));
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>, cvId: string) => {
        setCurrentData((prev) => ({
            ...prev,
            [cvId]: { ...prev[cvId], comment: e.target.value }
        }));
    };

    const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>, cvId: string) => {
        setCurrentData((prev) => ({
            ...prev,
            [cvId]: { ...prev[cvId], domain: e.target.value }
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
                    {primaryCV && (
                        <motion.div
                            key={primaryCV.id}
                            className="p-4 bg-gray-900 border border-gray-800 rounded-2xl shadow"
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

                    {otherCVs.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Verified CV Versions</h3>
                            <div className="space-y-4">
                                {otherCVs.map((cv) => (
                                    <motion.div
                                        key={cv.id}
                                        className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-2xl shadow"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <DocumentTextIcon className="h-6 w-6 text-cyan-400" />
                                            <div>
                                                <p className="font-semibold text-white">{cv.cv_filename}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDownload(cv)}
                                            className="flex items-center px-3 py-1.5 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                                        >
                                            <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
                                            Download
                                        </button>

                                        <div className="mt-4">
                                            {editing === String(cv.id) ? (
                                                <div className="flex items-center gap-4">
                                                    <select
                                                        value={currentData[cv.id]?.domain || ''}
                                                        onChange={(e) => handleDomainChange(e, String(cv.id))}
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
                                                        onChange={(e) => handleCommentChange(e, String(cv.id))}
                                                        placeholder="Add a comment"
                                                        className="p-2 bg-gray-800 text-white rounded border border-gray-700"
                                                    />
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => handleSave(String(cv.id))}
                                                            className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(String(cv.id))}
                                                            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <p className="text-sm text-cyan-400">{currentData[cv.id]?.domain || "Not Set"}</p>
                                                    <p className="text-sm text-cyan-400">{currentData[cv.id]?.comment || "No Comment"}</p>
                                                    <button
                                                        onClick={() => handleEdit(String(cv.id))}
                                                        className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
