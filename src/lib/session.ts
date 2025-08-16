import { SessionOptions } from 'iron-session';
import 'iron-session';

export type SessionUser = {
    id: number,
    email: string,
    role: string,
    name: string,
    
    pcomid?: number,
    permissions?: string[],
    is_active?: boolean
    is_verified?: boolean
}

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_PASSWORD as string,
    cookieName: 'charon_user',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
};

declare module 'iron-session' {
    interface IronSessionData {
        user: SessionUser;
    }
}
