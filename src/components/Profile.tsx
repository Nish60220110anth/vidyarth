import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { USER_ROLE } from "@prisma/client";
import { AnimatePresence, motion as m, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { roleIcons } from "@/constants/roleIcons";
import { fetchUserInfoQuery } from "@/lib/api/profmenu/profile";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";

type MentorInfo = { name: string; email_id: string; whatsapp_number?: string | null };
type UserDetail = {
    id: number;
    name: string;
    email_id: string;
    pgpid: string;
    pcomid?: number;
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
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

const Spinner: React.FC<{ size?: number }> = ({ size = 16 }) => (
    <div className="rounded-full border-4 border-cyan-400/90 border-t-transparent animate-spin" style={{ width: size, height: size }} />
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
        <path
            fill="currentColor"
            d="M16.04 3C9.39 3 4 8.39 4 15.04c0 2.12.55 4.18 1.6 6.01L4 29l8.16-1.53a12.97 12.97 0 0 0 3.88.59c6.65 0 12.04-5.39 12.04-12.02C28.08 8.39 22.69 3 16.04 3Zm0 22.02c-1.26 0-2.5-.21-3.68-.61l-.26-.09-4.86.91.93-4.74-.1-.27a9.99 9.99 0 1 1 8-15.35 10 10 0 0 1 0 20.15Zm5.4-7.45c-.29-.15-1.73-.86-1.99-.96-.27-.1-.46-.15-.65.15-.19.29-.75.95-.92 1.14-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.86-.76-1.45-1.69-1.62-1.98-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.65-1.56-.89-2.14-.24-.58-.49-.5-.65-.51-.17-.01-.36-.01-.55-.01-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44 0 1.44 1.04 2.83 1.19 3.03.15.2 2.04 3.1 4.95 4.34.69.3 1.24.47 1.67.6.7.22 1.34.19 1.84.11.56-.08 1.73-.71 1.98-1.4.24-.68.24-1.27.17-1.4-.07-.13-.27-.2-.56-.35Z"
        />
    </svg>
);

function buildMailto(email: string, subject?: string, body?: string) {
    const s = subject ? encodeURIComponent(subject) : "";
    const b = body ? encodeURIComponent(body) : "";
    const qs = [s && `subject=${s}`, b && `body=${b}`].filter(Boolean).join("&");
    return `mailto:${email}${qs ? `?${qs}` : ""}`;
}

function toDigits(s?: string | null) {
    return (s || "").replace(/\D/g, "");
}

function withCountryCode(digits: string) {
    if (!digits) return "";
    if (digits.startsWith("91") && digits.length >= 12) return digits;
    if (digits.length === 10) return `91${digits}`;
    return digits;
}

function buildWaLink(phone?: string | null) {
    const d = withCountryCode(toDigits(phone));
    return d ? `https://wa.me/${d}` : "";
}

function buildTelLink(phone?: string | null) {
    const d = toDigits(phone);
    const tel = d.length === 10 ? `+91${d}` : (phone || "");
    return tel ? `tel:${tel}` : "";
}

function ContactActions({
    name,
    email,
    phone,
    subject,
    body,
}: {
    name: string;
    email?: string | null;
    phone?: string | null;
    subject?: string;
    body?: string;
}) {
    const wa = buildWaLink(phone);
    const tel = buildTelLink(phone);
    const mail = email ? buildMailto(email, subject, body) : "";

    return (
        <div className="flex items-center gap-2">
            {email && (
                <a
                    href={mail}
                    className="inline-flex items-center justify-center rounded-md border border-cyan-900/60 bg-[#0a141d] p-1.5 text-cyan-300 hover:bg-[#0e1e2b]"
                    aria-label={`Email ${name}`}
                >
                    <EnvelopeIcon className="h-4 w-4" />
                </a>
            )}
            {phone && wa && (
                <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-emerald-900/60 bg-emerald-600/10 p-1.5 text-emerald-400 hover:bg-emerald-700/10"
                    aria-label={`WhatsApp ${name}`}
                >
                    <WhatsAppIcon className="h-4 w-4" />
                </a>
            )}
            {phone && tel && (
                <a
                    href={tel}
                    className="inline-flex items-center justify-center rounded-md border border-cyan-900/60 bg-[#0a141d] p-1.5 text-cyan-300 hover:bg-[#0e1e2b]"
                    aria-label={`Call ${name}`}
                >
                    <PhoneIcon className="h-4 w-4" />
                </a>
            )}
        </div>
    );
}

export default function Profile() {
    const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { basePath } = useRouter();
    const { user } = useAuth();

    const castRole: USER_ROLE | undefined = useMemo(() => {
        try {
            return (user?.role as USER_ROLE) ?? undefined;
        } catch {
            return undefined;
        }
    }, [user]);

    const { icon, color } =
        (castRole && roleIcons[castRole]) || { icon: (cls: string) => <div className={cls} />, color: "ring-cyan-700" };

    const [hasUserImage, setHasUserImage] = useState(false);
    const [userImageSrc, setUserImageSrc] = useState<string | null>(null);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadUser = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchUserInfoQuery(user?.id || 0);
            if (!mountedRef.current) return;
            setUserDetail(res ?? null);
        } catch {
            if (mountedRef.current) {
                setUserDetail(null);
                toast.error("Failed to load profile");
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [user?.id]);

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

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        const tryExtensions = async () => {
            const exts = ["png", "jpg", "jpeg"];
            for (const ext of exts) {
                if (cancelled) return;
                const path = `${basePath}/user-images/${user.id}.${ext}`;
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
    }, [user?.id, basePath]);

    const headerLine = useMemo(() => {
        const nm = toTitleCase(user?.name || userDetail?.name || "NA");
        const pcom = user?.pcomid ? `Hi ${user?.pcomid} - ${nm}` : `Hi ${nm}`;
        return pcom;
    }, [user?.name, user?.pcomid, userDetail?.name]);

    const row = (label: string, right: React.ReactNode) => (
        <div className="flex justify-between items-center border-b border-cyan-900/40 py-2">
            <span className="text-cyan-200/80">{label}</span>
            <div className="flex items-center gap-3 text-right">{right}</div>
        </div>
    );

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

    if (!user) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#081118] to-[#0a141d] px-4">
                <div className="w-full max-w-xl p-8 rounded-3xl border border-cyan-900/40 bg-[#0b1721] text-cyan-100 shadow-[0_0_40px_rgba(0,255,255,0.08)]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-cyan-200">Profile</h2>
                        <button
                            onClick={handleRefresh}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-md border transition ${refreshing ? "border-cyan-700 text-cyan-300 bg-[#0d1f2b]" : "border-cyan-800 text-cyan-200 hover:bg-[#0f2130]"
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
                <div className="flex items-start justify-between mb-6">
                    <div className="flex flex-col items-center gap-2">
                        <div className={`w-20 h-20 rounded-full ring-4 ${color} overflow-hidden`}>
                            {hasUserImage && userImageSrc ? (
                                <img src={`${userImageSrc}`} alt="User avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#0e1f2c] flex items-center justify-center">{icon("w-10 h-10 text-cyan-300")}</div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-md border transition ${refreshing ? "border-cyan-700 text-cyan-300 bg-[#0d1f2b]" : "border-cyan-800 text-cyan-200 hover:bg-[#0f2130]"
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
                    {userDetail?.is_student ? (
                        <>
                            <m.div
                                key="student-core"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.25 }}
                            >
                                {userDetail?.placement_cycle &&
                                    row(
                                        "Enrolled Cycle",
                                        <span className="text-cyan-50 font-medium">
                                            {userDetail.placement_cycle.cycle_type}-{userDetail.placement_cycle.year}
                                        </span>
                                    )}
                                {row("PGP ID", <span className="text-cyan-50 font-medium">{userDetail?.pgpid || <span className="text-cyan-300/50">Not assigned</span>}</span>)}

                                {userDetail?.disha_mentor &&
                                    row(
                                        "DISHA Mentor",
                                        <>
                                            <span className="text-cyan-50 font-medium">
                                                {toTitleCase(userDetail.disha_mentor.name)} ({userDetail.disha_mentor.email_id})
                                            </span>
                                            <ContactActions
                                                name={userDetail.disha_mentor.name}
                                                email={userDetail.disha_mentor.email_id}
                                                phone={userDetail.disha_mentor.whatsapp_number || undefined}
                                                subject={`DISHA Mentee ${userDetail.pcomid} - ${toTitleCase(userDetail.name)}`}
                                                body={`Hi ${toTitleCase(userDetail.disha_mentor.name)},\n\nI am ${toTitleCase(
                                                    userDetail.name
                                                )}, from your cohort. I mailed you to resolve a query pertaining to current ${userDetail.placement_cycle?.cycle_type ?? ""
                                                    } process.\n\nThanks,\n${toTitleCase(userDetail.name)}`}
                                            />
                                        </>
                                    )}
                            </m.div>

                            {userDetail?.shadow &&
                                row(
                                    "Shadow",
                                    <>
                                        <span className="text-cyan-50 font-medium">
                                            {toTitleCase(userDetail.shadow.name)} ({userDetail.shadow.email_id})
                                        </span>
                                        <ContactActions
                                            name={userDetail.shadow.name}
                                            email={userDetail.shadow.email_id}
                                            phone={userDetail.shadow.whatsapp_number || undefined}
                                            subject={`Cohort Shadow ${toTitleCase(userDetail.name)}`}
                                            body={`Hi ${toTitleCase(userDetail.shadow.name)},\n\nI am ${toTitleCase(
                                                userDetail.name
                                            )}, from ${toTitleCase(userDetail.disha_mentor?.name || "")}'s cohort. I mailed you to resolve a query pertaining to current ${userDetail.placement_cycle?.cycle_type ?? ""
                                                } process.\n\nThanks,\n${toTitleCase(userDetail.name)}`}
                                        />
                                    </>
                                )}
                        </>
                    ) : userDetail?.mentees?.length ? (
                        <m.div
                            key="mentor-mentees"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.25 }}
                            className="mt-2"
                        >
                            <p className="text-cyan-200/80 font-medium mb-2">DISHA Mentees</p>
                            <ul className="space-y-2">
                                {userDetail?.mentees.map((mentee, idx) => (
                                    <li key={idx} className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
                                        <span className="text-cyan-50/90 text-sm">
                                            {toTitleCase(mentee.name)} ({mentee.email_id})
                                        </span>
                                        <ContactActions name={mentee.name} email={mentee.email_id} phone={mentee.whatsapp_number || undefined} />
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
