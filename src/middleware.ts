import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_IPS = ['103.197.103.156', '127.0.0.1']; // Add localhost for dev

export function middleware(req: NextRequest) {
    // const ipHeader = req.headers.get('x-forwarded-for') || '';
    // const clientIP = ipHeader.split(',')[0]?.trim() || req.ip || '127.0.0.1'; // fallback

    // const isAllowed = ALLOWED_IPS.includes(clientIP);
    // const isRestrictedPage = req.nextUrl.pathname === '/restricted-entry';

    // if (!isAllowed && !isRestrictedPage) {
    //     const url = req.nextUrl.clone();
    //     url.pathname = '/restricted-entry';
    //     return NextResponse.redirect(url);
    // }

    return NextResponse.next();
}
