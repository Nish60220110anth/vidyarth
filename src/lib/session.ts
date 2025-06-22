import { SessionOptions } from 'iron-session';
import 'iron-session';

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_PASSWORD as string,
    cookieName: 'vidyarth_user',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
};

declare module 'iron-session' {
    interface IronSessionData {
        email?: string;
        role?: string;
        name?: string;
    }
}
