// utils/secureKey.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY!; // Must be 32 bytes
const IV_LENGTH = 16;
const EXPIRY_MS = 1000 * 60 * 60 * 24 * 90; // 3 months

type Payload = {
    key: string;
    cid: number;
    issuedAt: number;
};

export function encrypt(key: string, cid: number): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

    const payload: Payload = {
        key,
        cid,
        issuedAt: Date.now(),
    };

    const json = JSON.stringify(payload);
    let encrypted = cipher.update(json, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(
    encryptedText: string
): { success: true; key: string; cid: number } | { success: false; error: string } {
    try {
        const [ivHex, dataHex] = encryptedText.split(":");
        if (!ivHex || !dataHex) {
            return { success: false, error: "Invalid format" };
        }

        const iv = Buffer.from(ivHex, "hex");
        const encrypted = Buffer.from(dataHex, "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const payload = JSON.parse(decrypted.toString()) as Payload;

        if (Date.now() - payload.issuedAt > EXPIRY_MS) {
            return { success: false, error: "Key has expired" };
        }

        return { success: true, key: payload.key, cid: payload.cid };
    } catch (err) {
        return { success: false, error: "Decryption failed" };
    }
}
