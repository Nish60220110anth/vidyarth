import { useEffect } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";

import Sidebar from "@/components/Sidebar";
import UserLoadingScreen from "@/components/UserLoadingScreen";
import { baseUrl } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
    const router = useRouter();
    const { user, status, error, refresh, logout } = useAuth();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace(`${baseUrl}/`);
        }
    }, [status, router]);

    const handleLogout = async () => {
        const ok = await logout();
        if (ok) {
            toast.success("Logged out");
            router.replace(`${baseUrl}/`);
        } else {
            toast.error("Failed to log out");
        }
    };

    if (status === "idle" || status === "loading") {
        return (
            <UserLoadingScreen
                headline="Preparing your dashboard"
                subline="Fetching your profile and permissions…"
                tips={[
                    "Pro tip: Use the Refresh icon to re-sync data anytime.",
                    "Hint: Filters persist while you switch tabs.",
                    "FYI: Private files open via signed URLs.",
                    "Tip: Toggle roles to preview role-based content.",
                ]}
                tipIntervalMs={3000}
                initialProgress={5}
                progressStep={2}
                progressIntervalMs={80}
                maxIdleProgress={99}
                active
                surpressReducedMotion
            />
        );
    }

    if (status === "error" && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d1b24] to-[#0a141d] text-cyan-100">
                <div className="w-full max-w-md rounded-2xl border border-cyan-900 bg-[#0c0f11]/95 p-6 shadow-[0_0_24px_rgba(0,255,255,0.12)]">
                    <h1 className="text-2xl font-semibold text-cyan-300 mb-2">We hit a snag</h1>
                    <p className="text-cyan-200/80 text-sm mb-4">
                        {error ?? "Something went wrong. Please try again."}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={refresh}
                            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#0a141d] font-medium transition"
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => router.replace(`${baseUrl}/`)}
                            className="px-4 py-2 rounded-xl border border-cyan-800 text-cyan-200 hover:bg-[#0f1720] transition"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <Sidebar
            email={user.email}
            role={user.role}
            name={user.name}
            id={user.id}
            onLogout={handleLogout}
        />
    );
}
