import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { auth, authUser } from '@/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  IconGitHub,
  IconNextChat,
  IconSeparator,
  IconVercel
} from '@/components/ui/icons'
import { UserMenu } from '@/components/user-menu'
import { SidebarMobile } from './sidebar-mobile'
import { SidebarToggle } from './sidebar-toggle'
import { ChatHistory } from './chat-history'
import { Session } from '@/lib/types'
import { LangDropDown } from '@/components/header-language-dropdown'

const BIZGPT_IFRAME_MODE = process.env.BIZGPT_IFRAME_MODE

async function UserOrLogin() {
  const session = await authUser() 
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex items-center">
      {session?.user ? (
        <>
          <SidebarMobile>
            <ChatHistory userId={session.user.id} />
          </SidebarMobile>
          <SidebarToggle />
        </>
      ) : (
        <Link href="/new" rel="nofollow">
          <IconNextChat className="size-6 mr-2 dark:hidden" inverted />
          <IconNextChat className="hidden size-6 mr-2 dark:block" />
        </Link>
      )}
      <div className="flex items-center">
          { BIZGPT_IFRAME_MODE == 'true' ? (undefined) : (<IconSeparator className="h-6 w-6 text-muted-foreground/50" />) }
          {session?.user && BIZGPT_IFRAME_MODE == 'false' ? (
            <UserMenu email={session.user.email!} />
          ) : (
            BIZGPT_IFRAME_MODE == 'true' ? undefined :<Link href="/login">Login</Link>
          )}
        </div>
        </div>
      <div className="flex items-center justify-end space-x-2">
        <LangDropDown />
      </div>
    </header>
  )
}

export function Header() {
  return (
    // <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex items-center">
        <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
          <UserOrLogin />
        </React.Suspense>
      </div>
    // </header>
  )
}
