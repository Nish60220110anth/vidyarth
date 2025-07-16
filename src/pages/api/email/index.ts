import { apiHelpers } from '@/lib/server/responseHelpers';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { ACCESS_PERMISSION } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS, ACCESS_PERMISSION.MANAGE_EMAIL],
    },
};

interface EmailRequestBody {
    admin: string,
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html: string;
    attachments?: SendMailOptions["attachments"];
    replyTo?: string;
    notificationIds: number[]
}

async function handler(req: NextApiRequest, res: NextApiResponse) {

    const { admin, to, cc, bcc, subject, html, attachments, replyTo, notificationIds }: EmailRequestBody = req.body;

    if (!to || !subject || !html) {
        apiHelpers.badRequest(res, "Missing required fields")
        return;
    }

    const transporter: Transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions: SendMailOptions = {
        from: `${admin} <${process.env.EMAIL_USER}>`,
        to,
        cc,
        bcc,
        subject,
        html,
        replyTo,
        attachments,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        apiHelpers.success(res, { result, notificationIds })
        return;
    } catch (err: any) {
        console.log(err)
        apiHelpers.error(res, "Failed to send email", 500, {
            error: err.message || "Unknown error"
        });
        return;
    }
}

// export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
export default handler;
