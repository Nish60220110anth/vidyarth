import { useEffect, useState } from "react";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { toast } from "react-hot-toast";
import CompanySearchDropdown, { Company } from "./CompanySearchDropDown";
import { AnimatePresence, motion } from "framer-motion";
import PortalWrapper from "./PortableWrapper";

type Props = {
    name: string;
    email: string;
    role: string;
    id: number;
};

export default function AiMockSession({ id, name }: Props) {
    const [isHr, setIsHr] = useState<boolean>(false);
    const [selectedCvPath, setSelectedCvPath] = useState<string | undefined>();
    const [companyId, setCompanyId] = useState<number | undefined>();
    const [isSessionCreated, setIsSessionCreated] = useState<boolean>(false);
    const [showCompanyOverlay, setShowCompanyOverlay] = useState(false);
    const [cvList, setCvList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [sessionId, setSessionId] = useState<number | undefined>();

    const handleCreateSession = async () => {
        const data = {
            isInit: true,
            isCvHr: isHr,
            userId: id,
            companyId: companyId,
        };

        try {
            const response = await axios.post("/api/aimock", data);
            setIsSessionCreated(true);
            setSessionId(response.data.data.id);
        } catch (error) {
            console.error("Error creating session:", error);
            toast.error("Error creating session");
            return;
        }
    };

    const fetchCVs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/cv/?userid=${id}`, {
                headers: {
                    'x-access-permission': ACCESS_PERMISSION.ENABLE_MY_CV,
                },
            });

            if (!res.data.success) {
                toast.error(res.data.error);
                return;
            }

            setCvList(res.data.cvs || []);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch CVs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCVs();
    }, [id]);


    return (
        <div className="p-6 mx-auto bg-gradient-to-b from-gray-950 to-gray-900 min-h-screen text-white font-[Urbanist] max-w-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Choose HR or CV</h2>
                <div>
                    <button
                        onClick={() => {
                            setIsHr(true);
                            setCompanyId(undefined);
                        }}
                        className={`px-4 py-2 text-white rounded transition ${isHr ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                    >
                        HR
                    </button>
                    <button
                        onClick={() => setIsHr(false)}
                        className={`px-4 py-2 text-white rounded transition ml-4 ${!isHr ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                    >
                        CV
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {isHr ? (
                    <>
                        <div>
                            <h3 className="text-lg text-white mb-2">Select a CV</h3>
                            <select
                                onChange={(e) => setSelectedCvPath(e.target.value)}
                                value={selectedCvPath}
                                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
                            >
                                <option value="">Select CV</option>
                                {cvList.map((cv, index) => (
                                    <option key={index} value={cv.cv_path}>{cv.cv_filename}</option>
                                ))}
                            </select>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <h3 className="text-lg text-white mb-2">Select a CV</h3>
                            <select
                                onChange={(e) => setSelectedCvPath(e.target.value)}
                                value={selectedCvPath}
                                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
                            >
                                <option value="">Select CV</option>
                                {cvList.map((cv, index) => (
                                    <option key={index} value={cv.cv_path}>{cv.cv_filename}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={() => setShowCompanyOverlay(true)}
                                className="px-6 py-3 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                            >
                                Select Company
                            </button>
                        </div>

                        <AnimatePresence>
                            {showCompanyOverlay && (
                                <PortalWrapper>
                                    <div
                                        className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-sm text-gray-900"
                                        onClick={() => setShowCompanyOverlay(false)}
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            transition={{ duration: 0.25 }}
                                            className="relative w-full max-w-lg mx-4"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-4 bg-white/10 backdrop-blur-lg rounded-xl shadow-xl text-gray-900 min-h-96">
                                                <CompanySearchDropdown
                                                    onSelect={(company) => {
                                                        setCompanyId(company.id);
                                                        setShowCompanyOverlay(false);
                                                    }}
                                                    permission={ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY}
                                                />
                                            </div>
                                        </motion.div>
                                    </div>
                                </PortalWrapper>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>

            {(selectedCvPath && (isHr || companyId)) && (
                <div className="mt-6">
                    <button
                        onClick={handleCreateSession}
                        className="px-6 py-3 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                    >
                        Create Session
                    </button>
                </div>
            )}

            {isSessionCreated && (
                <div className="mt-6">
                    <h3 className="text-2xl font-semibold text-cyan-400">Main AI Mock Chat Session</h3>
                    <p className="text-cyan-300">AI Chat will appear here...</p>
                </div>
            )}
        </div>
    );
}
