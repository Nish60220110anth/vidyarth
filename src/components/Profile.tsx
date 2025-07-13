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
    placement_cycle: {
        year: string,
        cycle_type: string,
        batch_name: string,
        status: string
    }
};

function toTitleCase(name: string): string {
    return name
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}


export default function Profile({ name, email, role }: Props) {
    const [user, setUser] = useState<UserDetail | null>(null);
    const { icon, color } = roleIcons[role as USER_ROLE];

    const [hasUserImage, setHasUserImage] = useState(false);
    const [userImageSrc, setUserImageSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) return;

        const tryExtensions = async () => {
            const extensions = ["png", "jpg", "jpeg"];

            for (const ext of extensions) {
                const path = `/user-images/${user.id}.${ext}`;
                const img = new Image();
                img.src = path;

                const result = await new Promise<boolean>((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                });

                if (result) {
                    setUserImageSrc(path);
                    setHasUserImage(true);
                    return;
                }
            }

            setUserImageSrc(null);
            setHasUserImage(false);
        };

        tryExtensions();
    }, [user?.id]);

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
    

    const displayRow = (
        label: string,
        value: string | null | undefined,
        isEmail = false,
        emailSubject?: string,
        emailBody?: string
    ) => {
        const email = isEmail ? value?.match(/<(.+)>/)?.[1] ?? value : null;

        const mailtoLink = email
            ? `mailto:${email}?subject=${encodeURIComponent(emailSubject || "")}&body=${encodeURIComponent(emailBody || "")}`
            : "";

        return (
            <div className="flex justify-between items-center border-b border-gray-800 py-2">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-medium text-right">
                    {value ? (
                        isEmail && email ? (
                            <a
                                href={mailtoLink}
                                className="text-cyan-400 hover:underline break-all"
                            >
                                {value}
                            </a>
                        ) : (
                            value
                        )
                    ) : (
                        "Not assigned"
                    )}
                </span>
            </div>
        );
    };


    return (
        <div className="w-full h-full flex justify-center items-center bg-gradient-to-b from-gray-950 to-gray-900 px-4 overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-xl p-8 bg-gray-900 text-white rounded-3xl shadow-2xl font-[Urbanist] border border-gray-800"
            >
                <div className="flex flex-col items-center mb-6 space-y-2">

                    <div className={`w-20 h-20 rounded-full border-4 ${color} overflow-hidden`}>
                        {hasUserImage && userImageSrc ? (
                            <img
                                src={userImageSrc}
                                alt="User avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                {icon("w-10 h-10")}
                            </div>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-center mt-2">
                        Hi {user?.pcomid} {user?.pcomid? "-":""} {toTitleCase(user?.name || name)}
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
                                    {user.placement_cycle && displayRow(
                                        "Enrolled Cycle",
                                        `${user.placement_cycle.cycle_type}-${user.placement_cycle.year}`
                                    )}
                                    {displayRow('PGP ID', user.pgpid)}
                                    {displayRow(
                                        "DISHA Mentor",
                                        `${toTitleCase(user.disha_mentor.name)} (${user.disha_mentor.email_id})`,
                                        true,
                                        `DISHA Mentee ${user.pcomid} - ${toTitleCase(user.name)} Query`,
                                        `Hi ${toTitleCase(user.disha_mentor.name)},\n\nI am ${toTitleCase(user.name)}, from your cohort. I mailed you to resolve a query pertaining to current ${user.placement_cycle.cycle_type} process.\n\nThanks,\n${toTitleCase(user.name)}`
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
                                        `${toTitleCase(user.shadow.name)} (${user.shadow.email_id})`,
                                        true,
                                        `Cohort Shadow ${toTitleCase(user.name)}`,
                                        `Hi ${toTitleCase(user.shadow.name)} bro,\n\nI am ${toTitleCase(user.name)}, from ${toTitleCase(user.disha_mentor?.name || "")}'s cohort. I mailed you to resolve a query pertaining to current ${user.placement_cycle.cycle_type} process.\n\nThanks,\n${toTitleCase(user.name)}`
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
            </motion.div>
        </div>
    );
}
