import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Available locales
const locales = ['en', 'zh-Hant'];

// This middleware handles authentication and language detection
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  
  // Check if the URL already has a language parameter
  const langParam = request.nextUrl.searchParams.get('lang');
  
  // If no language parameter is present, detect the language and redirect
  if (!langParam) {
    // Get the preferred language from the Accept-Language header
    const acceptLanguage = request.headers.get('accept-language') || '';
    
    // Determine the language to use
    let detectedLocale = 'en'; // Default to English
    
    // Check if the Accept-Language header includes Chinese
    if (acceptLanguage.includes('zh')) {
      detectedLocale = 'zh-Hant';
    }
    
    // Create a new URL with the detected language
    const newUrl = new URL(request.nextUrl);
    newUrl.searchParams.set('lang', detectedLocale);
    
    // Redirect to the new URL with the language parameter
    return NextResponse.redirect(newUrl);
  }
  
  // Continue with the request
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
