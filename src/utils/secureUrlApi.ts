// utils/secureUrlApi.ts

type GenerateUrlResponse = {
    success: true;
    url: string;
} | {
    success: false;
    error: string;
};

type DecryptResponse = {
    success: true;
    key: string;
    id: number;
} | {
    success: false;
    error: string;
};

export async function generateSecureURL(key: string, id: number): Promise<GenerateUrlResponse> {
    try {
        const res = await fetch("/api/auth/encryption/generate-encrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, id }),
        });

        return await res.json();
    } catch (err) {
        return { success: false, error: "Failed to connect to encryption API" };
    }
}

export async function decodeSecureURL(auth: string): Promise<DecryptResponse> {
    try {
        const res = await fetch(`/api/auth/encryption/decode-encrypt?auth=${encodeURIComponent(auth)}`, {
            method: "GET",
        });

        return await res.json();
    } catch (err) {
        return { success: false, error: "Failed to connect to decryption API" };
    }
}
  