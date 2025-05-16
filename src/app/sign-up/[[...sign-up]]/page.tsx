'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
      setError(err instanceof Error ? err.message : 'An error occurred during Google sign up.');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="bg-white p-8 shadow-lg rounded-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-indigo-600 text-center">Sign Up for Recipe AI</h1>
        
        {success ? (
          <div className="text-center p-4 bg-green-100 text-green-800 rounded-lg">
            <p>Sign up successful! Please check your email for a confirmation link.</p>
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-lg w-full mb-4 flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors duration-200"
            >
              <svg className="mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24h21.351c.732 0 1.325-.593 1.325-1.325V1.325C24 .593 23.407 0 22.675 0zM7.138 20.452c-2.138-1.444-3.593-4.05-3.593-6.861 0-.715.086-1.409.249-2.067L.222 9.307C-.254 10.363-.503 11.513-.503 12.713c0 5.273 3.359 9.753 8.08 11.272-1.879-1.138-3.278-3.087-3.439-5.533" fill="#4285F4"/>
                <path d="M23.78 9.307c-.476-1.056-.725-2.206-.725-3.406 0-1.199.249-2.35.725-3.406l-3.572-2.217c-1.663 2.637-4.269 4.541-7.319 5.187 1.879 1.138 3.278 3.087 3.439 5.533-2.138-1.444-3.593-4.05-3.593-6.861 0-.715.086-1.409.249-2.067L.222 9.307C-.254 10.363-.503 11.513-.503 12.713c0 5.273 3.359 9.753 8.08 11.272L11.15 21.77c-2.14-2.01-3.491-5.012-3.491-8.284 0-3.272 1.351-6.274 3.491-8.284l3.572-2.217c-2.14-2.011-5.142-3.362-8.414-3.362-6.549 0-12.103 5.451-12.103 12.103s5.554 12.103 12.103 12.103c6.548 0 12.102-5.451 12.102-12.103 0-.598-.045-1.185-.122-1.759H23.78z" fill="#34A853"/>
                <path d="M11.15 21.77c-2.14-2.01-3.491-5.012-3.491-8.284 0-3.272 1.351-6.274 3.491-8.284l3.572-2.217c-2.14-2.011-5.142-3.362-8.414-3.362-3.169 0-6.05 1.247-8.163 3.279l3.572 2.217c1.663-2.637 4.269-4.541 7.319-5.187-1.879 1.138-3.278 3.087-3.439 5.533 2.138-1.444 3.593-4.05 3.593-6.861 0-.715-.086-1.409-.249-2.067l3.572-2.217c.476 1.056.725 2.206.725 3.406 0 1.199-.249 2.35-.725 3.406h3.572c.077.574.122 1.161.122 1.759 0 6.652-5.554 12.103-12.102 12.103-6.549 0-12.103-5.451-12.103-12.103s5.554-12.103 12.103-12.103c3.272 0 6.274 1.351 8.414 3.362l-3.572 2.217z" fill="#FBBC05"/>
                <path d="M23.78 14.614v-3.572h-3.572c-.077-.574-.122-1.161-.122-1.759 0-6.652 5.554-12.103 12.102-12.103v3.572-3.572c0 6.652-5.554 12.103-12.102 12.103H23.78z" fill="#EA4335"/>
              </svg>
              Sign Up with Google
            </button>

            <div className="text-center text-gray-500 my-4">OR</div>

            <form onSubmit={handleSignUp}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-indigo-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border border-indigo-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  placeholder="Enter your password"
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
                {loading ? 'Signing Up...' : 'Sign Up with Email'}
              </button>
            </form>
          </>
        )}
        
        <div className="text-center mt-6">
          <a href="/" className="text-indigo-500 hover:underline">Return to Home</a>
        </div>
        {success && (
          <div className="text-center mt-4">
            <a href="/sign-in" className="text-indigo-500 hover:underline">Go to Sign In</a>
          </div>
        )}
      </div>
    </div>
  );
}
