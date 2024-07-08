import { Vazirmatn } from 'next/font/google'
import { SidebarDesktop } from '@/components/sidebar-desktop'
import '@/app/globals.css'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { Toaster } from '@/components/ui/sonner'

const defaultTabName = process.env.NEXT_PUBLIC_CLIENT_BRANDING_NAME

export const metadata = {
  metadataBase: new URL(`https://${process.env.VERCEL_URL}`),
  title: {
    default: defaultTabName ? defaultTabName : 'BizGPT',
    template: `%s - ${defaultTabName ? defaultTabName : 'BizGPT'}`
  },
  description: 'An AI-powered chatbot By BizGPT.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  }
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

interface RootLayoutProps {
  children: React.ReactNode
}
const vazirmatn = Vazirmatn({ subsets: ['latin', 'arabic'] })

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fa" suppressHydrationWarning>
      <body className={vazirmatn.className}>
        <Toaster position="top-center" />
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex flex-col flex-auto bg-muted/50">
              {children}
            </main>
          </div>
          <TailwindIndicator />
        </Providers>
      </body>
    </html>
  )
}
