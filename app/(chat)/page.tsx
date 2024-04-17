//@ts-nocheck
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/original-chat/chat'
import { auth, authUser } from '@/auth'
import { cookies } from 'next/headers'
import { getChatSupabase, getChatLocal, getBookmarksLocal, getBookmarksSupabase, getFeedbacksLocal, getFeedbacksSupabase } from '@/components/original-chat/actions'

export const runtime = 'nodejs'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic';

export default async function IndexPage() {
  const cookieStore = cookies()
  const session = await authUser()
  const id = nanoid()

  let bookmarks = { 'bookmarks': {} };
  let feedbacks = { 'feedbacks': {} };
  let chat = { 'messages': [], 'id': id, 'userId': session?.user?.id }

  return <Chat id={id} username={session?.user?.email} initialMessages={chat.messages} bookmarks={bookmarks} feedbacks={feedbacks} bookmark_page={false} />

}
