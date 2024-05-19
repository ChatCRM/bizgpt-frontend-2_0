import { Metadata } from "next"
import Image from "next/image"

import { Separator } from "@/components/ui/separator"
import { SidebarDesktop } from '@/components/sidebar-desktop'
import { Toaster } from "@/components/ui/toaster"
import { GetTranslation } from "@/components/translation-helper/ClientTranslations"

export const metadata: Metadata = {
  title: "Administration",
  description: "BizGPT Administration",
}

const TextDirection = process.env.TEXT_DIRECTION


interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <>
      <div className="relative flex h-[calc(100vh_-_theme(spacing.16))] overflow-hidden">
        <SidebarDesktop />
        {children}
      </div>
      <Toaster />
    </>
  )
}
