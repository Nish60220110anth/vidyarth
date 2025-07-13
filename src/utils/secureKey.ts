// utils/secureKey.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY!;
const IV_LENGTH = 16;

function getExpiryMs({
    days = 0,
    weeks = 0,
    months = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
}: {
    days?: number;
    weeks?: number;
    months?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
}): number {
    const dayMs = 1000 * 60 * 60 * 24;
    const monthMs = dayMs * 30;
    return (
        months * monthMs +
        weeks * 7 * dayMs +
        days * dayMs +
        hours * 60 * 60 * 1000 +
        minutes * 60 * 1000 +
        seconds * 1000
    );
}

const EXPIRY_MS = getExpiryMs({ minutes: 10 })

type Payload = {
    key: string;
    id: number;
    issuedAt: number;
};

export function encrypt(key: string, id: number): string {

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

    const payload: Payload = {
        key,
        id,
        issuedAt: Date.now(),
    };

    const json = JSON.stringify(payload);
    let encrypted = cipher.update(json, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(
    encryptedText: string
): { success: true; key: string; id: number } | { success: false; error: string } {
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

        return { success: true, key: payload.key, id: payload.id };
    } catch (err) {
        return { success: false, error: "Decryption failed" };
    }
}
