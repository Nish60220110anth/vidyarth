import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { USER_ROLE } from "@prisma/client";
import { AnimatePresence, motion as m, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { roleIcons } from "@/constants/roleIcons";
import { fetchUserInfoQuery } from "@/lib/api/profmenu/profile";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

/* ----------------------------- Types & helpers ---------------------------- */

type Props = {
    name: string;
    email: string;
    role: string; // comes in as string; we’ll cast to USER_ROLE defensively
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
    placement_cycle?: {
        year: string;
        cycle_type: string;
        batch_name: string;
        status: string;
    } | null;
};

export function toTitleCase(name: string): string {
    return name
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

const Spinner: React.FC<{ size?: number }> = ({ size = 16 }) => (
    <div
        className="rounded-full border-4 border-cyan-400/90 border-t-transparent animate-spin"
        style={{ width: size, height: size }}
    />
);

/* --------------------------------- Component -------------------------------- */

export default function Profile({ name, email, role }: Props) {
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const castRole: USER_ROLE | undefined = useMemo(() => {
        try {
            return (role as USER_ROLE) ?? undefined;
        } catch {
            return undefined;
        }
    }, [role]);

    const { icon, color } =
        (castRole && roleIcons[castRole]) ||
        // fallback ring color if role not mapped
        { icon: (cls: string) => <div className={cls} />, color: "ring-cyan-700" };

    // avatar state
    const [hasUserImage, setHasUserImage] = useState(false);
    const [userImageSrc, setUserImageSrc] = useState<string | null>(null);

    // unmount guard
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    /* ------------------------------- Data loading ------------------------------ */

    const loadUser = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchUserInfoQuery(name, email, castRole as USER_ROLE);
            if (!mountedRef.current) return;
            setUser(res ?? null);
        } catch {
            if (mountedRef.current) {
                setUser(null);
                toast.error("Failed to load profile");
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [name, email, castRole]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const handleRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await loadUser();
        } finally {
            setRefreshing(false);
        }
    }, [loadUser]);

    // avatar detection (runs when we have a user.id)
    useEffect(() => {
        if (!user?.id) return;

        let cancelled = false;

        const tryExtensions = async () => {
            const exts = ["png", "jpg", "jpeg"];
            for (const ext of exts) {
                if (cancelled) return;
                const path = `/user-images/${user.id}.${ext}`;
                const img = new Image();
                img.src = path;

                const ok = await new Promise<boolean>((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                });

                if (ok) {
                    if (!cancelled) {
                        setUserImageSrc(path);
                        setHasUserImage(true);
                    }
                    return;
                }
            }
            if (!cancelled) {
                setUserImageSrc(null);
                setHasUserImage(false);
            }
        };

        tryExtensions();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    /* --------------------------------- UI bits -------------------------------- */

    const displayRow = (
        label: string,
        value: string | null | undefined,
        isEmail = false,
        emailSubject?: string,
        emailBody?: string
    ) => {
        const extracted = isEmail ? value?.match(/<(.+)>/)?.[1] ?? value : null;
        const mailtoLink =
            isEmail && extracted
                ? `mailto:${extracted}?subject=${encodeURIComponent(emailSubject || "")}&body=${encodeURIComponent(emailBody || "")}`
                : "";

        return (
            <div className="flex justify-between items-center border-b border-cyan-900/40 py-2">
                <span className="text-cyan-200/80">{label}</span>
                <span className="text-cyan-50 font-medium text-right break-words">
                    {value ? (
                        isEmail && extracted ? (
                            <a href={mailtoLink} className="text-cyan-400 hover:underline break-words">
                                {value}
                            </a>
                        ) : (
                            value
                        )
                    ) : (
                        <span className="text-cyan-300/50">Not assigned</span>
                    )}
                </span>
            </div>
        );
    };

    const headerLine = useMemo(() => {
        const nm = toTitleCase(user?.name || name);
        const pcom = user?.pcomid ? `Hi ${user?.pcomid} - ${nm}` : `Hi ${nm}`;
        return pcom;
    }, [user?.name, user?.pcomid, name]);

    /* -------------------------------- Rendering ------------------------------- */

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#081118] to-[#0a141d] px-4">
                <div className="w-full max-w-xl p-8 rounded-3xl border border-cyan-900/40 bg-[#0b1721] shadow-[0_0_40px_rgba(0,255,255,0.08)]">
                    <div className="flex flex-col items-center gap-4">
                        <Spinner size={48} />
                        <p className="text-cyan-200/90">Loading profile…</p>
                        <div className="w-full mt-2 space-y-2">
                            <div className="h-4 bg-cyan-900/30 rounded animate-pulse" />
                            <div className="h-4 bg-cyan-900/30 rounded animate-pulse w-5/6" />
                            <div className="h-4 bg-cyan-900/30 rounded animate-pulse w-2/3" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // If still no user data, show a soft empty state
    if (!user) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#081118] to-[#0a141d] px-4">
                <div className="w-full max-w-xl p-8 rounded-3xl border border-cyan-900/40 bg-[#0b1721] text-cyan-100 shadow-[0_0_40px_rgba(0,255,255,0.08)]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-cyan-200">Profile</h2>
                        <button
                            onClick={handleRefresh}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-md border transition ${refreshing
                                    ? "border-cyan-700 text-cyan-300 bg-[#0d1f2b]"
                                    : "border-cyan-800 text-cyan-200 hover:bg-[#0f2130]"
                                }`}
                            disabled={refreshing}
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                    <p className="text-cyan-300/80">We couldn’t load your profile. Please try again.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex justify-center items-center bg-gradient-to-b from-[#081118] to-[#0a141d] px-4 overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="w-full max-w-xl p-8 bg-[#0b1721] text-cyan-50 rounded-3xl shadow-[0_0_40px_rgba(0,255,255,0.08)] border border-cyan-900/40 font-[Urbanist]"
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex flex-col items-center gap-2">
                        <div className={`w-20 h-20 rounded-full ring-4 ${color} overflow-hidden`}>
                            {hasUserImage && userImageSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={userImageSrc} alt="User avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#0e1f2c] flex items-center justify-center">
                                    {icon("w-10 h-10 text-cyan-300")}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-md border transition ${refreshing
                                ? "border-cyan-700 text-cyan-300 bg-[#0d1f2b]"
                                : "border-cyan-800 text-cyan-200 hover:bg-[#0f2130]"
                            }`}
                        disabled={refreshing}
                        aria-label="Refresh profile"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                <h1 className="text-2xl font-bold text-center mb-4">{headerLine}</h1>

                <AnimatePresence mode="wait">
                    {user.is_student ? (
                        <>
                            <m.div
                                key="student-core"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.25 }}
                            >
                                {user.placement_cycle &&
                                    displayRow(
                                        "Enrolled Cycle",
                                        `${user.placement_cycle.cycle_type}-${user.placement_cycle.year}`
                                    )}
                                {displayRow("PGP ID", user.pgpid)}

                                {user.disha_mentor &&
                                    displayRow(
                                        "DISHA Mentor",
                                        `${toTitleCase(user.disha_mentor.name)} (${user.disha_mentor.email_id})`,
                                        true,
                                        `DISHA Mentee ${user.pcomid} - ${toTitleCase(user.name)}`,
                                        `Hi ${toTitleCase(user.disha_mentor.name)},\n\nI am ${toTitleCase(
                                            user.name
                                        )}, from your cohort. I mailed you to resolve a query pertaining to current ${user.placement_cycle?.cycle_type ?? ""
                                        } process.\n\nThanks,\n${toTitleCase(user.name)}`
                                    )}
                            </m.div>

                            {user.shadow && (
                                <m.div
                                    key="student-shadow"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    {displayRow(
                                        "Shadow",
                                        `${toTitleCase(user.shadow.name)} (${user.shadow.email_id})`,
                                        true,
                                        `Cohort Shadow ${toTitleCase(user.name)}`,
                                        `Hi ${toTitleCase(user.shadow.name)},\n\nI am ${toTitleCase(
                                            user.name
                                        )}, from ${toTitleCase(user.disha_mentor?.name || "")}'s cohort. I mailed you to resolve a query pertaining to current ${user.placement_cycle?.cycle_type ?? ""
                                        } process.\n\nThanks,\n${toTitleCase(user.name)}`
                                    )}
                                </m.div>
                            )}
                        </>
                    ) : user.mentees?.length ? (
                        <m.div
                            key="mentor-mentees"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.25 }}
                            className="mt-2"
                        >
                            <p className="text-cyan-200/80 font-medium mb-2">DISHA Mentees</p>
                            <ul className="list-disc list-inside space-y-1 text-cyan-50/90 text-sm">
                                {user.mentees.map((mentee, idx) => (
                                    <li key={idx}>
                                        {toTitleCase(mentee.name)} ({mentee.email_id})
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
