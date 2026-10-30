import { Geist } from 'next/font/google'
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ESG Disclosure Assurance System | Vanguard-inspired academic prototype',
  description: 'NUS GRC academic prototype demonstrating ESG disclosure verification, exception escalation and independent control evidence.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#a6192e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${geist.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
