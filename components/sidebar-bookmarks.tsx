import * as React from 'react'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import { SidebarList } from '@/components/sidebar-list'
import { buttonVariants } from '@/components/ui/button'
import { IconPlus } from '@/components/ui/icons'
import GlobalConfig from '@/app/app.config.js'
import { GetTranslation } from '@/components/translation-helper/ClientTranslations'

export async function SideBarBookmarks() {
  return (
    <>
      {/* <h4 className="mb-2 px-4 text-sm font-medium">
                <GetTranslation text="Bookmarks" />
            </h4>
            <div className="mb-2 px-6">
                <Link
                    href="/bookmarks"
                    className={cn(
                        buttonVariants({ variant: 'outline' }),
                        'h-10 justify-start bg-zinc-50 px-4 shadow-none transition-colors hover:bg-zinc-200/40 dark:bg-zinc-900 dark:hover:bg-zinc-300/10'
                    )}
                >
                    <GetTranslation text="Bookmarks" />
                </Link>
            </div> */}
    </>
  )
}
