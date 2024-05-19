// @ts-nocheck 
import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { auth, authUser } from '@/auth'
import { getChatSupabase, getChatLocal, getBookmarksLocal, getFeedbacksLocal, getBookmarksSupabase, getFeedbacksSupabase } from '@/components/original-chat/actions'
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

  if (mode?.replace('"','') == 'supabase') 
  {
    bookmarks = await getBookmarksSupabase(session?.user?.id, params.id)
    feedbacks = await getFeedbacksSupabase(session?.user?.id, params.id)
  }

  else if (mode?.replace('"','') == 'local'){

    // correcting the [bookmarks] schema
    let temp_response_bookmarks = await getBookmarksLocal(session?.user?.email, params.id)
    if (!temp_response_bookmarks.hasOwnProperty('bookmarks')) bookmarks = { 'bookmarks': temp_response_bookmarks}
    else bookmarks = await getBookmarksLocal(session?.user?.email)
    // correcting the [feedbacks] schema
    let temp_response_feedbacks = await getFeedbacksLocal(session?.user?.email, params.id)
    if (!temp_response_feedbacks.hasOwnProperty('feedbacks')) feedbacks = { 'feedbacks': temp_response_feedbacks}
    else feedbacks = await getFeedbacksLocal(session?.user?.email)
  } 


  return <Chat id={chat.id} user_id={session?.user?.id} initialMessages={chat.messages} username={session?.user?.email} bookmarks={bookmarks} feedbacks={feedbacks} bookmark_page={false} />
}
