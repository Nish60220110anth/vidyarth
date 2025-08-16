import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Props = {
    open?: boolean;
    headline?: string;
    subline?: string;
    tips?: string[];
    progress?: number;
    complete?: boolean;
    onComplete?: () => void;
};

export default function UserLoadingScreen({
    open = true,
    headline = "Preparing your dashboard",
    subline = "Fetching your profile and permissions…",
    tips,
    progress,
    complete = false,
    onComplete,
}: Props) {
    const prefersReducedMotion = useReducedMotion();

    const defaultTips = useMemo(
        () =>
            tips ?? [
                "Pro tip: Use the Refresh icon to re-sync data anytime.",
                "Tip: Filters persist while you navigate between tabs.",
                "FYI: Private files open via secure signed URLs.",
                "Hint: Toggle roles to preview role-based content.",
            ],
        [tips]
    );

    const [tipIndex, setTipIndex] = useState(0);
    const [internalProgress, setInternalProgress] = useState(8);

    const TIP_ROTATE_MS = 2400;
    const TICK_MS = 90;
    const STEP = 1;
    const MAX_IDLE = 90;
    const FINISH_EASE_MS = prefersReducedMotion ? 100 : 450;

    const effectiveProgress =
        typeof progress === "number" ? progress : internalProgress;

    useEffect(() => {
        if (!open || defaultTips.length === 0) return;
        const id = setInterval(
            () => setTipIndex((i) => (i + 1) % defaultTips.length),
            TIP_ROTATE_MS
        );
        return () => clearInterval(id);
    }, [open, defaultTips.length]);

    useEffect(() => {
        if (!open) return;
        if (typeof progress === "number") return;
        const id = setInterval(() => {
            setInternalProgress((p) => (p < MAX_IDLE ? p + STEP : p));
        }, TICK_MS);
        return () => clearInterval(id);
    }, [open, progress]);

    useEffect(() => {
        if (!open || !complete) return;
        const id = setTimeout(() => {
            setInternalProgress(100);
            onComplete?.();
        }, FINISH_EASE_MS);
        return () => clearTimeout(id);
    }, [open, complete, FINISH_EASE_MS, onComplete]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0d1b24] to-[#0a141d] text-cyan-100 font-[Urbanist]"
            role="status"
            aria-live="polite"
        >
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20"
                    style={{
                        background:
                            "radial-gradient(60% 60% at 50% 50%, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)",
                    }}
                />
                <div
                    className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20"
                    style={{
                        background:
                            "radial-gradient(60% 60% at 50% 50%, rgba(6,182,212,0.35) 0%, rgba(6,182,212,0) 70%)",
                    }}
                />
            </div>

            <div className="relative w-full max-w-lg mx-4">
                {/* Spinner (no DOM branching; motion toggled via props/classes) */}
                <div className="flex flex-col items-center mb-7">
                    <div className="relative">
                        <motion.div
                            className="relative rounded-full border-4 border-cyan-400/70 border-t-transparent motion-reduce:border-t-cyan-400/70"
                            style={{ width: 72, height: 72, willChange: "transform" }}
                            initial={{ rotate: 0 }}
                            animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : { duration: 3, ease: [0.22, 1.0, 0.36, 1.0], repeat: Infinity }
                            }
                            aria-label="Loading"
                        >
                            {/* Subtle sheen (always present; animation disabled when reduced) */}
                            <motion.div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background:
                                        "conic-gradient(from 0deg, rgba(255,255,255,0.22) 0deg, transparent 60deg 360deg)",
                                    mask: "radial-gradient(farthest-side, transparent 62%, black 63%)",
                                    WebkitMask:
                                        "radial-gradient(farthest-side, transparent 62%, black 63%)",
                                }}
                                initial={{ rotate: 0, opacity: 0.7 }}
                                animate={{
                                    rotate: prefersReducedMotion ? 0 : 360,
                                    opacity: prefersReducedMotion ? 0.7 : 0,
                                }}
                                transition={
                                    prefersReducedMotion
                                        ? { duration: 0 }
                                        : { duration: 5, ease: "easeInOut", repeat: Infinity }
                                }
                                aria-hidden
                            />
                        </motion.div>

                        <div
                            className="absolute inset-0 rounded-full blur-md opacity-40"
                            style={{ boxShadow: "0 0 50px rgba(34,211,238,0.35)" }}
                            aria-hidden
                        />
                    </div>
                </div>

                <div className="text-center mb-5">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-wide text-cyan-200">
                        {headline}
                    </h2>
                    <p className="mt-2 text-base md:text-lg text-cyan-300/85">{subline}</p>
                </div>

                <div className="mt-4">
                    <div className="h-2.5 w-full rounded-full bg-[#0b1a22] border border-cyan-900/60 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{
                                width: `${effectiveProgress}%`,
                                backgroundImage:
                                    "linear-gradient(90deg, rgba(34,211,238,0.9), rgba(6,182,212,0.9))",
                            }}
                        />
                    </div>

                    {/* Shimmer bar: same DOM always; animation toggled via props */}
                    <div
                        className="relative -mt-2 h-2.5 w-full pointer-events-none overflow-hidden rounded-full"
                        aria-hidden
                    >
                        <motion.div
                            className="absolute top-0 h-full w-1/3 bg-white/10 blur-sm"
                            initial={{ x: "-30%" }}
                            animate={{ x: prefersReducedMotion ? "-30%" : "130%" }}
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : { repeat: Infinity, duration: 1.6, ease: "easeInOut" }
                            }
                        />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[13px] md:text-sm text-cyan-300/75">
                        <span>Initializing modules…</span>
                        <span>
                            {Math.min(100, Math.max(0, Math.round(effectiveProgress)))}%
                        </span>
                    </div>
                </div>

                <div className="mt-6 h-14 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tipIndex}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="px-4 py-2 rounded-md border border-cyan-900/60 bg-[#0f1f27]/70 text-cyan-200/95 text-sm md:text-base text-center"
                        >
                            {defaultTips[tipIndex]}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <p className="mt-7 text-center text-[12px] md:text-sm text-cyan-300/70">
                    Secure session · Optimizing for your role &amp; permissions
                </p>
            </div>
        </div>
    );
}
