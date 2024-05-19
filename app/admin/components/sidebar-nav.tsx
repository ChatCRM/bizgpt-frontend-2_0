//@ts-nocheck
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

import GlobalConfig from '@/app/app.config.js'

const sidebarNavItems = [
  {
    title: "Knowledgebase",
    href: "",
    links:[
      {
        title: "Knowledgebase",
        href: "/admin",
      },
      // {
      //   title: "Knowledgebase Overview",
      //   href: "/admin/knowledgebasedetails",
      // }
    ]
  },
  {
    title: "Access Control",
    href: "/admin/access-control",
  }
]

const TextDirection = process.env.TEXT_DIRECTION

export function SidebarNav({ className, ...props }: SidebarNavProps) {
  const pathname = usePathname()

  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

  return (
    <nav
      dir={TextDirection}
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-0",
        className
      )}
      {...props}
    >
        
      {/* Knowledgebase */}
      <h1 dir={TextDirection}> <strong> 
      {TranslationData["Knowledgebase"]}
         </strong> </h1>
        <Link key="/admin" 
          href="/admin"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === "/admin"
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start"
          )}
        >
        {TranslationData["Details"]}
          
        </Link>
        {/* <Link key="/admin/knowledgebase-details" 
          href="/admin/knowledgebase-details"
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === "/admin/knowledgebase-details"
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start"
          )}
        >
        {TranslationData["Details"]}
        </Link> */}
        
        {/* Access Control */}
        <h1 dir={TextDirection}> <strong> 
          {TranslationData["Access Control"]}
          </strong></h1>
        <Link key="/admin/access-control" 
          href="/admin/access-control"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === "/admin/access-control"
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start"
          )}
        >
          {TranslationData["Manage User Roles"]}
        </Link>
        
        {/* Feedbacks */}
        <h1 dir={TextDirection}> <strong> 
          {TranslationData["Feedbacks"]}
          </strong></h1>
        <Link key="/admin/feedbacks" 
          href="/admin/feedbacks"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === "/admin/feedbacks"
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start"
          )}
        >
          {TranslationData["Feedback Details"]}
        </Link>

    </nav>
  )
}
