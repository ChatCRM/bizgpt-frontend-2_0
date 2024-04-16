'use client'

import { useChat, type Message } from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/original-chat/chat-list'
import { ChatPanel } from '@/components/original-chat/chat-panel'
import { EmptyScreen } from '@/components/original-chat/empty-screen'
import { ChatScrollAnchor } from '@/components/original-chat/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string,
  username?: String | undefined,
  bookmarks?: JSON | undefined,
  feedbacks?: JSON | undefined,
  bookmark_page: Boolean
}

export function Chat({ id, initialMessages, username, bookmarks, feedbacks, bookmark_page, className }: ChatProps) {
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [firstLoad, setFirstLoad] = useState(true)
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      initialMessages,
      id,
      body: {
        id,
        previewToken
      },
      onResponse(response) {
        if (response.status === 401) {
          toast.error(response.statusText)
        }
      }
    })

  // Scroll down upon initial page load
  useEffect(() => {
    if (firstLoad) {
      window.scrollTo({
        top: document.body.offsetHeight,
        behavior: 'smooth'
      })
      console.log(firstLoad)
      setFirstLoad(false)
    }
    else {
      setFirstLoad(false)
    }
  }
    , [firstLoad])

  return (
    <>
      <div className='pb-[200px] pt-4 md:pt-10 group w-full overflow-auto pl-0 peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[0px]'>
        {messages.length ? (
          <>
            <ChatList messages={messages} username={username} bookmarks={bookmarks} feedbacks={feedbacks} bookmark_page={bookmark_page} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
      />
    </>
  )
}
