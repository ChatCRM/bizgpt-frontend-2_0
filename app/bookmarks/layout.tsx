import { SidebarDesktop } from '@/components/sidebar-desktop'

interface BookmarkLayoutProps {
  children: React.ReactNode
}

export default async function BookmarksLayout({ children }: BookmarkLayoutProps) {
  return (
    <div className="relative flex h-[calc(100vh_-_theme(spacing.16))] overflow-hidden">
      <SidebarDesktop />
      {children}
    </div>
  )
}
