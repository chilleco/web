import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const authRequiredPaths = ['/profile', '/billing', '/settings'];
const moderatorPaths = ['/admin', '/analytics'];

const intlProxy = createMiddleware({
    ...routing,
    localeDetection: true,
    alternateLinks: false,
});

function stripLocale(pathname: string) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length && routing.locales.includes(segments[0] as never)) {
        segments.shift();
    }
    return `/${segments.join('/')}`;
}

function requiresAuth(pathname: string) {
    return authRequiredPaths.some((p) => pathname.startsWith(p));
}

function requiresModerator(pathname: string) {
    return moderatorPaths.some((p) => pathname.startsWith(p));
}

function getStatusFromJwt(token?: string | null): number | null {
    if (!token) return null;
    const raw = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    const parts = raw?.split('.');
    if (!parts || parts.length < 2) return null;
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return typeof payload.status === 'number' ? payload.status : null;
    } catch {
        return null;
    }
}

export default function proxy(request: NextRequest) {
    const response = intlProxy(request);
    const pathname = stripLocale(request.nextUrl.pathname);

    const authCookie = request.cookies.get('Authorization')?.value || request.cookies.get('authToken')?.value;
    const status = getStatusFromJwt(authCookie);

    if (requiresAuth(pathname) && !authCookie) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    if (requiresModerator(pathname)) {
        if (!authCookie || status === null || status < 4) {
            const url = request.nextUrl.clone();
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/',
        '/(en|ru|zh|es|ar)/:path*',
        '/((?!api|_next|_vercel|.*\\.).*)'
    ]
};
