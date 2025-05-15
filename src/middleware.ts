import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is a simplified middleware that doesn't use Clerk
// It allows all routes to be accessed without authentication
export function middleware(request: NextRequest) {
  // Just pass through all requests without authentication for now
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)', 
    '/', 
    '/(api|trpc)(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)'
  ]
};
