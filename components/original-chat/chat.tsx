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

import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor'
import { useRouter } from 'next/navigation'

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
  username?: String | undefined
  bookmarks?: JSON | undefined
  feedbacks?: JSON | undefined
  bookmark_page: Boolean
  chat_id: Number
  user_id: String | undefined
}

export function Chat({
  id,
  initialMessages,
  user_id,
  username,
  bookmarks,
  feedbacks,
  bookmark_page,
  className
}: ChatProps) {
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const router = useRouter()
  const [firstLoad, setFirstLoad] = useState(true)
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } =
    useScrollAnchor()

  // const [threadId, setThreadId] = useState('')

  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      initialMessages,
      id,
      body: {
        id,
        previewToken,
        user_id,
        username
        // threadId
      },
      onResponse(response) {
        if (response.status === 401) {
          toast.error(response.statusText)
        }
      },
      onFinish() {
        console.log(id)
        router.push(`/chat/${id}`)
        router.refresh()
      }
    })

  const [_, setNewChatId] = useLocalStorage('newChatId', id)

  //////// NOTE: DEPRECATED CODE
  // // Scroll down upon initial page load
  // useEffect(() => {
  //   if (firstLoad) {
  //     window.scrollTo({
  //       top: document.body.offsetHeight,
  //       behavior: 'smooth'
  //     })
  //     setFirstLoad(false)
  //   }
  //   else {
  //     setFirstLoad(false)
  //   }
  // }
  //   , [firstLoad])

  // create a new threadID when chat component created
  // useEffect(() => {
  //   const createThread = async () => {
  //     const res = await fetch(`/api/assistants/threads`, {
  //       method: 'POST'
  //     })
  //     const data = await res.json()
  //     setThreadId(data.threadId)
  //     // console.log(`ThreadId is ${data.threadId}`)
  //   }
  //   createThread()
  // }, [])

  useEffect(() => {
    setNewChatId(id)
  })
  return (
    <>
      <div
        className="group w-full overflow-auto pl-0 peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[250px]"
        ref={scrollRef}
      >
        <div
          className={cn('pb-[200px] pt-4 md:pt-10', className)}
          ref={messagesRef}
        >
          {messages.length ? (
            <>
              <ChatList
                chat_id={id}
                messages={messages}
                username={username}
                user_id={user_id}
                bookmarks={bookmarks}
                feedbacks={feedbacks}
                bookmark_page={bookmark_page}
              />
              <ChatScrollAnchor trackVisibility={isLoading} />
            </>
          ) : (
            <EmptyScreen setInput={setInput} />
          )}
          <div className="h-px w-full" ref={visibilityRef} />
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
          isAtBottom={isAtBottom}
          scrollToBottom={scrollToBottom}
          // threadId={threadId}
        />
      </div>
    </>
  )
}
