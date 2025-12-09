import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  const pathname = url.pathname;

  if (pathname.endsWith('/dotmoney/deeplink')) {
    const redirectUrl = url.searchParams.get('redirect');

    // Check if path ENDING with /dotmoney/deeplink
    if (!redirectUrl) {
      return NextResponse.next();
    }

    // Redirect out of domain
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}
