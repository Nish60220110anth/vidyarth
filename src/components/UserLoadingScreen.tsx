import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Props = {
    headline?: string;
    subline?: string;
    tips?: string[];

    /** Show/hide the overlay */
    active?: boolean;

    /** Rotate tip every N ms */
    tipIntervalMs?: number;

    initialProgress?: number;     // start value
    progressStep?: number;        // increment per tick
    progressIntervalMs?: number;  // tick interval
    maxIdleProgress?: number;     // cap while still loading (e.g., 90)

    /** Controlled progress (use either this OR the uncontrolled props above) */
    progress?: number;

    /** When true, animates to 100 and calls onFinished() */
    finish?: boolean;
    surpressReducedMotion?: boolean;
    onFinished?: () => void;
};

export default function UserLoadingScreen({
    headline = "Preparing your dashboard",
    subline = "Fetching your profile and permissions…",
    tips,
    active = true,

    tipIntervalMs = 2400,

    initialProgress = 8,
    progressStep = 1,
    progressIntervalMs = 90,
    maxIdleProgress = 90,

    progress,
    finish = false,
    surpressReducedMotion = true,
    onFinished,
}: Props) {
    const prefersReducedMotion = surpressReducedMotion ? false : useReducedMotion();

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
    const [internalProgress, setInternalProgress] = useState(initialProgress);

    const effectiveProgress =
        typeof progress === "number" ? progress : internalProgress;

    useEffect(() => {
        if (!active || defaultTips.length === 0) return;
        const tipTimer = setInterval(() => {
            setTipIndex((i) => (i + 1) % defaultTips.length);
        }, tipIntervalMs);
        return () => clearInterval(tipTimer);
    }, [active, defaultTips.length, tipIntervalMs]);

    useEffect(() => {
        if (!active) return;
        if (typeof progress === "number") return; // controlled mode

        const progTimer = setInterval(() => {
            setInternalProgress((p) => (p < maxIdleProgress ? p + progressStep : p));
        }, progressIntervalMs);

        return () => clearInterval(progTimer);
    }, [active, progress, progressIntervalMs, progressStep, maxIdleProgress]);

    useEffect(() => {
        if (!active) return;
        if (!finish) return;

        // Smoothly animate to 100, then call onFinished
        const t = setTimeout(() => {
            setInternalProgress(100);
            onFinished?.();
        }, prefersReducedMotion ? 100 : 450); // brief ease-out window
        return () => clearTimeout(t);
    }, [active, finish, prefersReducedMotion, onFinished]);

    if (!active) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0d1b24] to-[#0a141d] text-cyan-100 font-[Urbanist]"
            role="status"
            aria-live="polite"
        >
            {/* Backdrop glows */}
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
                {/* Spinner */}
                <div className="flex flex-col items-center mb-7">
                    <div className="relative">
                        <motion.div
                            className="h-18 w-18 md:h-20 md:w-20 rounded-full border-4 border-cyan-400/70 border-t-transparent"
                            animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                            transition={
                                prefersReducedMotion
                                    ? undefined
                                    : { repeat: Infinity, ease: "linear", duration: 1.1 }
                            }
                        />
                        <div
                            className="absolute inset-0 rounded-full blur-md opacity-40"
                            style={{ boxShadow: "0 0 50px rgba(34,211,238,0.35)" }}
                        />
                    </div>
                </div>

                {/* Headline / Subline */}
                <div className="text-center mb-5">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-wide text-cyan-200">
                        {headline}
                    </h2>
                    <p className="mt-2 text-base md:text-lg text-cyan-300/85">
                        {subline}
                    </p>
                </div>

                {/* Progress bar with animated gradient fill */}
                <div className="mt-4">
                    <div className="h-2.5 w-full rounded-full bg-[#0b1a22] border border-cyan-900/60 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{
                                width: `${effectiveProgress}%`,
                                backgroundImage:
                                    "linear-gradient(90deg, rgba(34,211,238,0.9), rgba(6,182,212,0.9))",
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${effectiveProgress}%` }}
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0.2 }
                                    : { type: "spring", stiffness: 120, damping: 22 }
                            }
                        />
                    </div>

                    {/* Shimmer overlay */}
                    {!prefersReducedMotion && (
                        <motion.div
                            className="relative -mt-2 h-2.5 w-full pointer-events-none overflow-hidden rounded-full"
                            aria-hidden
                        >
                            <motion.div
                                className="absolute top-0 h-full w-1/3 bg-white/10 blur-sm"
                                initial={{ x: "-30%" }}
                                animate={{ x: "130%" }}
                                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                            />
                        </motion.div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[13px] md:text-sm text-cyan-300/75">
                        <span>Initializing modules…</span>
                        <span>{Math.min(100, Math.max(0, Math.round(effectiveProgress)))}%</span>
                    </div>
                </div>

                {/* Rotating tips */}
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

                {/* Footer line */}
                <p className="mt-7 text-center text-[12px] md:text-sm text-cyan-300/70">
                    Secure session · Optimizing for your role &amp; permissions
                </p>
            </div>
        </div>
    );
}
