import { motion } from "framer-motion";

export default function Spinner({
    size = 24,
    color = "text-cyan-400",
    className = "",
}: {
    size?: number;
    color?: string;
    className?: string;
}) {
    return (
        <motion.div
            className={`animate-spin ${color} ${className}`}
            style={{ width: size, height: size }}
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{
                repeat: Infinity,
                ease: "linear",
                duration: 1,
            }}
        >
            <svg
                className="w-full h-full"
                viewBox="0 0 24 24"
                fill="none"
            >
                <circle
                    className="opacity-20"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <path
                    className="opacity-80"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
            </svg>
        </motion.div>
    );
}
