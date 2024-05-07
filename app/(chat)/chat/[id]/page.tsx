// @ts-nocheck 
import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { auth, authUser } from '@/auth'
import { getChatSupabase, getChatLocal, getBookmarksLocal, getFeedbacksLocal } from '@/components/original-chat/actions'
import { Chat } from '@/components/original-chat/chat'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic';

export interface ChatPageProps {
  params: {
    id: string
  }
}

// export async function generateMetadata({
//   params
// }: ChatPageProps): Promise<Metadata> {
//   const cookieStore = cookies()
//   const session = await authUser()

//   if (!session?.user) {
//     return {}
//   }

//   const chat = await getChat(params.id)
//   return {
//     title: chat?.title.toString().slice(0, 50) ?? 'Chat'
//   }
// }

export default async function ChatPage({ params }: ChatPageProps) {
  const cookieStore = cookies()
  const session = await authUser()

  if (!session?.user) {
    redirect(`/sign-in?next=/chat/${params.id}`)
  }

  let bookmarks = { 'bookmarks': {} };
  let feedbacks = { 'feedbacks': {} };
  let mode = process.env.PERSISTENCE_MODE;

  const chat = await getChatSupabase(params.id)

  if (!chat) {
    notFound()
  }

  return <Chat id={chat.id} user_id={session?.user?.id} initialMessages={chat.messages} username={session?.user?.email} bookmarks={bookmarks} feedbacks={feedbacks} bookmark_page={false} />
}
