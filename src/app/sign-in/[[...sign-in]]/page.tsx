'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  
  // Check if user was signed out from demo account
  useEffect(() => {
    const signout = searchParams.get('signout');
    if (signout === 'true') {
      setSignedOut(true);
    }
  }, [searchParams]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Redirect to homepage or dashboard after successful login
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during Google sign in.');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <div className="bg-white p-8 shadow-lg rounded-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-indigo-600 text-center">{t('auth.signIn.title')}</h1>
        
        {signedOut && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-6 text-sm">
            <div className="flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
              </svg>
              <div>
                <p className="font-medium">{t('auth.signIn.signedOut')}</p>
                <p className="mt-1">{t('auth.signIn.signedOutDescription')}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col space-y-4 mb-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-lg w-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24h21.351c.732 0 1.325-.593 1.325-1.325V1.325C24 .593 23.407 0 22.675 0zM7.138 20.452c-2.138-1.444-3.593-4.05-3.593-6.861 0-.715.086-1.409.249-2.067L.222 9.307C-.254 10.363-.503 11.513-.503 12.713c0 5.273 3.359 9.753 8.08 11.272-1.879-1.138-3.278-3.087-3.439-5.533" fill="#4285F4"/>
              <path d="M23.78 9.307c-.476-1.056-.725-2.206-.725-3.406 0-1.199.249-2.35.725-3.406l-3.572-2.217c-1.663 2.637-4.269 4.541-7.319 5.187 1.879 1.138 3.278 3.087 3.439 5.533-2.138-1.444-3.593-4.05-3.593-6.861 0-.715.086-1.409.249-2.067L.222 9.307C-.254 10.363-.503 11.513-.503 12.713c0 5.273 3.359 9.753 8.08 11.272L11.15 21.77c-2.14-2.01-3.491-5.012-3.491-8.284 0-3.272 1.351-6.274 3.491-8.284l3.572-2.217c-2.14-2.011-5.142-3.362-8.414-3.362-6.549 0-12.103 5.451-12.103 12.103s5.554 12.103 12.103 12.103c6.548 0 12.102-5.451 12.102-12.103 0-.598-.045-1.185-.122-1.759H23.78z" fill="#34A853"/>
              <path d="M11.15 21.77c-2.14-2.01-3.491-5.012-3.491-8.284 0-3.272 1.351-6.274 3.491-8.284l3.572-2.217c-2.14-2.011-5.142-3.362-8.414-3.362-3.169 0-6.05 1.247-8.163 3.279l3.572 2.217c1.663-2.637 4.269-4.541 7.319-5.187-1.879 1.138-3.278 3.087-3.439 5.533 2.138-1.444 3.593-4.05 3.593-6.861 0-.715-.086-1.409-.249-2.067l3.572-2.217c.476 1.056.725 2.206.725 3.406 0 1.199-.249 2.35-.725 3.406h3.572c.077.574.122 1.161.122 1.759 0 6.652-5.554 12.103-12.102 12.103-6.549 0-12.103-5.451-12.103-12.103s5.554-12.103 12.103-12.103c3.272 0 6.274 1.351 8.414 3.362l-3.572 2.217z" fill="#FBBC05"/>
              <path d="M23.78 14.614v-3.572h-3.572c-.077-.574-.122-1.161-.122-1.759 0-6.652 5.554-12.103 12.102-12.103v3.572-3.572c0 6.652-5.554 12.103-12.102 12.103H23.78z" fill="#EA4335"/>
            </svg>
            {t('auth.signIn.googleSignIn')}
          </button>
          
          <button
            onClick={() => {
              if (!signedOut) {
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
              }
            }}
            type="button"
            disabled={signedOut}
            className={`${
              signedOut 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            } border border-indigo-200 px-4 py-3 rounded-lg w-full flex items-center justify-center shadow-md transition-colors duration-200`}
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {signedOut ? t('auth.signIn.demoAccountUnavailable') : t('auth.signIn.demoAccount')}
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
          <a href="/sign-up" className="text-indigo-500 hover:underline block">{t('auth.signIn.noAccount')}</a>
          <div className="text-xs text-gray-500">
            <span className="font-medium text-indigo-500">{t('common.demoMode')}:</span> {t('auth.signIn.demoAccountNote')}
          </div>
        </div>
      </div>
    </div>
  );
}
