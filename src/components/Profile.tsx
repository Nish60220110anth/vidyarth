import { useEffect, useState } from "react";
import { USER_ROLE } from "@prisma/client";
import { AnimatePresence, motion as m, motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-hot-toast";
import { roleIcons } from "./Sidebar";
import { UserCircleIcon } from "@heroicons/react/24/solid";

type Props = {
    name: string;
    email: string;
    role: string;
};

type MentorInfo = { name: string; email_id: string };
type UserDetail = {
    id: number;
    name: string;
    email_id: string;
    pgpid: string;
    pcomid: string;
    role: string;
    is_student: boolean;
    disha_mentor?: MentorInfo | null;
    shadow?: MentorInfo | null;
    mentees?: MentorInfo[];
};

export default function Profile({ name, email, role }: Props) {
    const [user, setUser] = useState<UserDetail | null>(null);
    const { icon, color } = roleIcons[role as USER_ROLE];

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const queryRes = await axios.get("/api/users/query", {
                    params: { name, email: email, role },
                });

                if (!queryRes.data.success) {
                    toast.error(queryRes.data.error);
                    return;
                }

                const userId = queryRes.data.data.id;
                const detailRes = await axios.get(`/api/users/${userId}`);

                if (detailRes.data.success) {
                    setUser(detailRes.data.data);
                } else {
                    toast.error(detailRes.data.error);
                }
            } catch {
                toast.error("Failed to load user info");
            }
        };

        fetchUserInfo();
    }, [name, email, role]);

    const displayRow = (label: string, value: string | null | undefined) => (
        <div className="flex justify-between items-center border-b border-gray-800 py-2">
            <span className="text-gray-400">{label}</span>
            <span className="text-white font-medium text-right">
                {value || "Not assigned"}
            </span>
        </div>
    );

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-gray-950 to-gray-900 px-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-xl p-8 bg-gray-900 text-white rounded-3xl shadow-2xl font-[Urbanist] border border-gray-800"
            >
                <div className="flex flex-col items-center mb-6 space-y-2">
                    <div
                        className={`w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center border-4 ${color}`}
                    >
                        {icon("w-10 h-10")}
                    </div>
                    <h1 className="text-2xl font-bold text-center mt-2">
                        Hi {user?.pcomid || "PCOM ID"} – {user?.name || name}
                    </h1>
                </div>

                <AnimatePresence mode="wait">
                    {user?.is_student ? (
                        <>
                            {user.disha_mentor && (
                                <m.div
                                    key="disha"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {displayRow(
                                        "DISHA Mentor",
                                        `${user.disha_mentor.name} (${user.disha_mentor.email_id})`
                                    )}
                                </m.div>
                            )}

                            {user.shadow && (
                                <m.div
                                    key="shadow"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {displayRow(
                                        "Shadow",
                                        `${user.shadow.name} (${user.shadow.email_id})`
                                    )}
                                </m.div>
                            )}
                        </>
                    ) : user?.mentees?.length ? (
                        <m.div
                            key="mentees"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4"
                        >
                            <p className="text-gray-400 font-medium mb-1">DISHA Mentees</p>
                            <ul className="list-disc list-inside space-y-1 text-gray-200 text-sm">
                                {user.mentees.map((mentee, idx) => (
                                    <li key={idx}>
                                        {mentee.name} ({mentee.email_id})
                                    </li>
                                ))}
                            </ul>
                        </m.div>
                    ) : null}
                </AnimatePresence>

                <div className="mt-6 flex justify-center">
                    <button className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 transition-all rounded-lg text-sm font-medium shadow-md">
                        Edit Profile
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
