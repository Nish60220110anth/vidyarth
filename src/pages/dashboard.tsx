import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";

import Sidebar from "@/components/Sidebar";
import UserLoadingScreen from "@/components/UserLoadingScreen";
import { baseUrl } from "@/lib/config";

type User = {
    id: number;
    email: string;
    role: string;
    name: string;
};

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const ac = new AbortController();
        (async () => {
            try {
                const res = await fetch(`${baseUrl}/api/auth/user`, { signal: ac.signal });
                console.log(`res: ${res}`);
                if (!res.ok) {
                    router.replace(`${baseUrl}/`);
                    return;
                }
                const data: User = await res.json();
                setUser(data);
            } catch (err: any) {
                if (err?.name !== "AbortError") router.replace(`${baseUrl}/`);
            } finally {
                if (!ac.signal.aborted) {
                    setTimeout(() => {
                        setLoading(false)
                    }, 1000);
                };
            }
        })();
        return () => ac.abort();
    }, [router]);

    const handleLogout = useCallback(async () => {
        try {
            const res = await fetch(`${baseUrl}/api/auth/user`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Logged out");
        } catch {
            toast.error("Failed to log out");
        } finally {
            router.replace(`${baseUrl}/`);
        }
    }, [router]);
    
    if (loading || !user) {
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
                active={loading}
                surpressReducedMotion={true}
            />
        );
    }
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
