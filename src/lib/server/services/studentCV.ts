import {prisma} from '../../prisma';
import { DOMAIN } from '@prisma/client';

async function getStudentCVs(userId: number) {
    return prisma.student_cv.findMany({
        where: { userId },
        orderBy: { is_primary: 'desc' }
    });
}

async function getStudentIDByCVId(cvId: number) {
    const cv = await prisma.student_cv.findUniqueOrThrow({
        where: { id: cvId },
        select: { userId: true }
    });

    return cv.userId;
}

async function updateStudentCV(cvId: number, domain?: string, comment?: string) {
    return prisma.student_cv.update({
        where: { id: cvId },
        data: {
            domain: domain as DOMAIN,
            comment
        }
    });
}

export {
    getStudentCVs,
    getStudentIDByCVId,
    updateStudentCV
}