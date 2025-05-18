import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/i18n/I18nContext'
import { headers } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Recipe AI',
  description: 'Personalized Recipe Generation Platform',
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
      <body className={inter.className}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
