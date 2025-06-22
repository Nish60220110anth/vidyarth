import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const { to, cc, bcc, subject, body } = req.body;

    if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const transporter = nodemailer.createTransport({
        port: 465,
        host: "smtp.gmail.com",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        secure: true,
    });
      
    try {
        await transporter.sendMail({
            from: `"Vidyarth" <${process.env.EMAIL_USER}>`,
            to: to,
            cc: cc,
            bcc: bcc,
            subject: subject,
            html: "Something Imporant"
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Error sending email:", err); // <- Check terminal output
        return res.status(500).json({ error: "Failed to send email" });
    }
}
