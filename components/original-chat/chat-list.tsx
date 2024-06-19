import { type Message } from 'ai'

import { Separator } from '@/components/ui/separator'
import { ChatMessage } from '@/components/original-chat/chat-message'

export interface ChatList {
  messages: Message[],
  username: String | undefined,
  bookmarks: JSON | undefined,
  feedbacks: JSON | undefined,
  bookmark_page: Boolean
  chat_id: String | undefined
  user_id: String | undefined
}

export function ChatList({ chat_id, messages, user_id, username, bookmarks, feedbacks, bookmark_page}: ChatList) {
  if (!messages.length) {
    return null
  }
  console.log(feedbacks)
  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map((message, index) => (
        <div key={index}>
          <ChatMessage chat_id= {chat_id} message={message} index={index} user_id={user_id} username={username} bookmarks={bookmarks} feedbacks={feedbacks} bookmark_page={bookmark_page}/>
          {index < messages.length - 1 && index % 2 != 0 && index >= 1 && (
            <Separator className="my-4 md:my-8" />
          )}
        </div>
      ))}
    </div>
  )
}
