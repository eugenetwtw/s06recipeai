import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/i18n/I18nContext'
import { headers } from 'next/headers'
import AuthHandler from '@/components/AuthHandler'
import LanguageSelector from '@/components/LanguageSelector'

const inter = Inter({ subsets: ['latin', 'latin-ext'] })

export async function generateMetadata(): Promise<Metadata> {
  // Get the accept-language header to determine the initial language
  const headersList = headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const initialLang = acceptLanguage.includes('zh') ? 'zh-Hant' : 'en';
  
  // Return dynamic metadata based on language
  return {
    title: initialLang === 'zh-Hant' ? '食譜AI' : 'Recipe AI',
    description: initialLang === 'zh-Hant' 
      ? '個人化食譜生成平台' 
      : 'Personalized Recipe Generation Platform',
    alternates: {
      languages: {
        'en': '/?lang=en',
        'zh-Hant': '/?lang=zh-Hant',
      },
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the accept-language header to determine the initial language
  const headersList = headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const initialLang = acceptLanguage.includes('zh') ? 'zh-Hant' : 'en';
  
  return (
    <html lang={initialLang}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <I18nProvider>
          <AuthHandler />
          <div className="fixed top-4 right-4 z-50">
            <LanguageSelector />
          </div>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
