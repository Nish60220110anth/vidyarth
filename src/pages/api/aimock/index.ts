import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getFieldValue } from '@/utils/parseApiField';

interface AIRequestBody {
    isInit: boolean;
    isCvHr: boolean;
    userId: string;
    companyName?: string;
    companyId?: string;
    jdLinks: string[];
    compendiumLinks: string[];
    question?: string;
}

const aiUrl = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:4000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { isInit, isCvHr, userId, companyId }: AIRequestBody = req.body;

    if (!userId || (!isCvHr  && !companyId)) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (isInit) {
        try {

            const fuserId = parseInt(getFieldValue(userId));
            const fcompanyId = parseInt(getFieldValue(companyId));

            const company = await prisma.company.findUnique({
                where: {
                    id: fcompanyId
                }
            });

            const jdLinks = await prisma.company_jd.findMany({
                where: {
                    company_id: fcompanyId
                },
                select: {
                    pdf_path: true
                }
            })

            const compendiumLinks = await prisma.company_compendium_pdf_path.findMany({
                where: {
                    compendium: {
                        company_id: fcompanyId
                    }
                },
                select: {
                    pdf_path: true
                }
            })

            const userSession = await prisma.usersession.create({
                data: {
                    userId: fuserId,
                    isCvHr,
                    companyName: company?.company_full,
                    companyId: fcompanyId,
                    jdLinks: jdLinks.join(','),
                    compendiumLinks: compendiumLinks.join(','),
                },
            });

            res.status(200).json({ success: true, message: 'Session Initialized', data: userSession });
        } catch (error: any) {
            res.status(500).json({ success: false, message: 'Failed to initialize session', error: error.message });
        }
    } else {

        const { id, question } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        try {
            const fid = parseInt(getFieldValue(id));

            const storedSession = await prisma.usersession.findUnique({
                where: { id: fid },
            });

            if (!storedSession) {
                return res.status(400).json({ success: false, message: 'Session not found. Please initialize first.' });
            }

            const serverResponse = await fetch(aiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isInit: false,
                    isCvHr: storedSession.isCvHr,
                    userId: storedSession.userId,
                    companyName: storedSession.companyName,
                    companyId: storedSession.companyId,
                    jdLinks: storedSession.jdLinks.split(','),
                    compendiumLinks: storedSession.compendiumLinks.split(','),
                    question,
                }),
            });

            const responseJson = await serverResponse.json();
            res.status(200).json({ success: true, data: responseJson });
        } catch (error: any) {
            res.status(500).json({ success: false, message: 'Error processing the question', error: error.message });
        }
    }
}
