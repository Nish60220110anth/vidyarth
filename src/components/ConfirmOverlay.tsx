// components/ConfirmRowOverlay.tsx
import { motion } from "framer-motion";

export default function ConfirmRowOverlay({
    message,
    onConfirm,
    onCancel,
}: {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded-lg"
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-gray-800 font-medium"
            >
                <span>{message}</span>
                <div className="flex gap-2 mt-1 sm:mt-0">
                    <button
                        onClick={onConfirm}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Yes
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                        No
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
