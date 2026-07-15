import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value;
  const role = request.cookies.get('sb-user-role')?.value;

  const url = request.nextUrl.clone();
  const { pathname } = url;

  // 1. Protect coach routes (/coach/*)
  if (pathname.startsWith('/coach')) {
    if (!token || role !== 'coach') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // 2. Protect student/general dashboard routes (/dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // 3. If authenticated, redirect away from login page
  if (pathname.startsWith('/login')) {
    if (token) {
      if (role === 'coach') {
        url.pathname = '/coach/dashboard';
      } else {
        url.pathname = '/dashboard';
      }
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/coach/:path*',
    '/dashboard/:path*',
    '/login'
  ],
};
