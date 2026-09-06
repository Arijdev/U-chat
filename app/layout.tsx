import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: {
    default: 'U-Chat — Real-Time Encrypted Chat & Video Calling',
    template: '%s | U-Chat',
  },
  description:
    'Experience lightning-fast encrypted real-time messaging, stories, and peer-to-peer HD voice and video calling.',
  applicationName: 'U-Chat',
  keywords: ['chat', 'messaging', 'video call', 'webrtc', 'encrypted chat', 'realtime'],
  authors: [{ name: 'Arijdev' }],
  creator: 'U-Chat Team',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'U-Chat',
    title: 'U-Chat — Real-Time Encrypted Chat & Video Calling',
    description:
      'Lightning-fast encrypted real-time messaging, stories, and peer-to-peer HD voice and video calling.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'U-Chat — Real-Time Encrypted Chat & Video Calling',
    description:
      'Lightning-fast encrypted real-time messaging, stories, and peer-to-peer HD voice and video calling.',
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
