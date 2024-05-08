import { Sidebar } from '@/components/sidebar'

import { authUser } from '@/auth'
import { ChatHistory } from '@/components/chat-history'
import { SideBarAdmin } from '@/components/sidebar-administration'
import { SideBarBookmarks } from '@/components/sidebar-bookmarks'
import { Separator } from "@/components/ui/separator"
export async function SidebarDesktop() {
  const session = await authUser()

  if (!session?.user?.id) {
    return null
  }

  return (
    <Sidebar className="peer absolute inset-y-0 z-30 hidden -translate-x-full border-r bg-muted duration-300 ease-in-out data-[state=open]:translate-x-0 lg:flex lg:w-[250px] xl:w-[300px]">
      {/* @ts-ignore */}
      <h4 className="mb-2 px-2 pt-2 text-xl font-bold">
                Navigation
            </h4>
      <SideBarBookmarks />
      <SideBarAdmin />
      <Separator />
      <ChatHistory userId={session.user.id} />
    </Sidebar>
  )
}
