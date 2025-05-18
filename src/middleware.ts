import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Available locales - keep in sync with I18nContext.tsx
const locales = ['en', 'zh-Hant'];

// This middleware handles authentication and language detection
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the URL already has a language parameter
  const langParam = request.nextUrl.searchParams.get('lang');
  
  // Skip language detection for API routes, static assets, and auth callback
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticAsset = /\.(jpg|jpeg|png|gif|svg|ico|css|js)$/i.test(pathname);
  const isAuthCallback = pathname.startsWith('/api/auth-callback');
  
  // If no language parameter is present and it's not an API route, auth callback, or static asset, detect the language and redirect
  // But only do this for the initial page load, not for subsequent navigation
  const isInitialPageLoad = !request.headers.get('referer')?.includes(request.nextUrl.origin);
  
  // Check for a cookie with the preferred language
  const preferredLanguage = request.cookies.get('preferred-language')?.value;
  
  // Only redirect if:
  // 1. No language parameter is present
  // 2. It's not an API route, auth callback, or static asset
  // 3. It's the initial page load (not navigation within the site)
  // 4. There's no preferred language cookie
  if (!langParam && !isApiRoute && !isStaticAsset && !isAuthCallback && isInitialPageLoad && !preferredLanguage) {
    // Get the preferred language from the Accept-Language header
    const acceptLanguage = request.headers.get('accept-language') || '';
    
    // Determine the language to use
    let detectedLocale = 'en'; // Default to English
    
    // Parse the Accept-Language header to find the best match
    const acceptedLanguages = acceptLanguage
      .split(',')
      .map(lang => {
        const [language, quality = '1'] = lang.trim().split(';q=');
        return { language, quality: parseFloat(quality) };
      })
      .sort((a, b) => b.quality - a.quality)
      .map(item => item.language);
    
    // Find the first accepted language that matches our supported locales
    for (const lang of acceptedLanguages) {
      if (lang.startsWith('zh')) {
        detectedLocale = 'zh-Hant';
        break;
      } else if (lang.startsWith('en')) {
        detectedLocale = 'en';
        break;
      }
    }
    
    // Create a new URL with the detected language
    const newUrl = new URL(request.nextUrl);
    
    // Preserve the original pathname for all pages
    newUrl.searchParams.set('lang', detectedLocale);
    
    // Set a cookie with the detected language
    const response = NextResponse.redirect(newUrl);
    response.cookies.set('preferred-language', detectedLocale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
    
    return response;
  }
  
  // Continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except those starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};
