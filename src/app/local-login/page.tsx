'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/i18n/I18nContext';

export default function LocalLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Force the redirect URL to be the current origin
      const currentOrigin = window.location.origin;
      
      // Include the current language in the redirect URL
      const callbackUrl = new URL(`${currentOrigin}/`);
      callbackUrl.searchParams.set('lang', locale);
      
      console.log('Email sign-in redirect URL:', callbackUrl.toString());
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Redirect to homepage with language parameter
      router.push(callbackUrl.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Set the appropriate demo account based on current language
    if (locale === 'zh-Hant') {
      setEmail('demo-zh-Hant@demo.com');
    } else {
      setEmail('demo@demo.com');
    }
    setPassword('demodemo');
    
    // Submit the form after a short delay to allow state to update
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
    }, 100);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="bg-white p-8 shadow-lg rounded-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-indigo-600 text-center">{t('auth.signIn.title')} (Local Development)</h1>
        
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-6 text-sm">
          <div className="flex items-start">
            <svg className="h-5 w-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            <div>
              <p className="font-medium">Local Development Login</p>
              <p className="mt-1">Google OAuth is not available in local development due to Supabase configuration. Please use email/password or the demo account instead.</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-4 mb-4">
          <button
            onClick={handleDemoLogin}
            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 px-4 py-3 rounded-lg w-full flex items-center justify-center shadow-md transition-colors duration-200"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {t('auth.signIn.demoAccount')}
          </button>
        </div>

        <div className="text-center text-gray-500 my-4">{t('auth.signIn.or')}</div>

        <form onSubmit={handleEmailSignIn}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-1">{t('auth.signIn.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-indigo-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder={t('auth.signIn.emailPlaceholder')}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 mb-1">{t('auth.signIn.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full border border-indigo-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder={t('auth.signIn.passwordPlaceholder')}
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm mb-4 text-center">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-500 text-white px-6 py-3 rounded-lg w-full hover:bg-indigo-600 transition-colors duration-200"
          >
            {loading ? t('auth.signIn.signingIn') : t('auth.signIn.emailSignIn')}
          </button>
        </form>
        <div className="text-center mt-6 space-y-2">
          <a href={`/?lang=${locale}`} className="text-indigo-500 hover:underline block">{t('auth.signUp.returnHome')}</a>
          <div className="text-xs text-gray-500">
            <span className="font-medium text-indigo-500">{t('common.demoMode')}:</span> {t('auth.signIn.demoAccountNote')}
          </div>
        </div>
      </div>
    </div>
  );
}
