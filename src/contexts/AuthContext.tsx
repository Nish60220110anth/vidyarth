import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { baseUrl } from "@/lib/config";
import { SessionUser } from "@/lib/session";

export type User = SessionUser;

type Status = "idle" | "loading" | "authenticated" | "unauthenticated" | "error";

type AuthContextValue = {
    user: User | null;
    status: Status;
    error?: string | null;
    refresh: () => Promise<void>;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    logout: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            setStatus("loading");
            setError(null);

            const res = await fetch(`${baseUrl}/api/auth/user`, {
                signal: ac.signal,
                cache: 'no-cache',
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });

            const userResp = await res.json();

            if (res.status === 401 || res.status === 403) {
                setUser(null);
                setStatus("unauthenticated");
                return;
            }

            if(userResp.status === "error") {
                setUser(null);
                setStatus("error");
                setError(userResp.message || "Unknown error");
                return;
            }

            if(userResp.status === "unauthenticated") {
                setUser(null);
                setStatus("unauthenticated");
                return;
            }

            if (!userResp || typeof userResp.data.id !== "number" || !userResp.data.email || !userResp.data.role || !userResp.data.name) {
                setUser(null);
                setStatus("error");
                setError("Malformed user payload");
                return;
            }

            setUser(userResp.data as User);
            setStatus("authenticated");
        } catch (e: any) {
            if (e?.name === "AbortError") return;
            setUser(null);
            setStatus("error");
            setError("Network error");
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const res = await fetch(`${baseUrl}/api/auth/user`, { method: "DELETE" });
            if (!res.ok) throw new Error("logout failed");
            setUser(null);
            setStatus("unauthenticated");
            return true;
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        refresh(); 
        return () => abortRef.current?.abort();
    }, [refresh]);

    const value = useMemo<AuthContextValue>(
        () => ({ user, status, error, refresh, setUser, logout }),
        [user, status, error, refresh, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
