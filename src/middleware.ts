import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    if (req.nextUrl.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
        return new NextResponse(null, { status: 204 });
    }
    return NextResponse.next();
}
