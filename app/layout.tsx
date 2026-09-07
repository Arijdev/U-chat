import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: {
    default: 'Arixo Web',
    template: '%s | Arixo Web',
  },
  description:
    'Arixo Web — Simple. Reliable. Private. Real-time messaging, audio and video calling right from your browser.',
  applicationName: 'Arixo Web',
  keywords: ['arixo web', 'arixo', 'chat', 'messaging', 'video call', 'encrypted messaging'],
  authors: [{ name: 'Arixo' }],
  creator: 'Arixo Web',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Arixo Web',
    title: 'Arixo Web',
    description:
      'Simple. Reliable. Private. Real-time messaging, audio and video calling right from your browser.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arixo Web',
    description:
      'Simple. Reliable. Private. Real-time messaging, audio and video calling right from your browser.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground selection:bg-blue-600 selection:text-white transition-colors duration-200`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
