// @ts-nocheck 
import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { auth, authUser } from '@/auth'
import { getChatSupabase, getChatLocal, getBookmarksLocal, getFeedbacksLocal } from '@/app/actions'
import { Chat } from '@/components/chat'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic';

export interface ChatPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: ChatPageProps): Promise<Metadata> {
  const cookieStore = cookies()
  const session = await authUser()

  if (!session?.user) {
    return {}
  }

  const chat = await getChat(params.id)
  return {
    title: chat?.title.toString().slice(0, 50) ?? 'Chat'
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const cookieStore = cookies()
  const session = await authUser()

  if (!session?.user) {
    redirect(`/sign-in?next=/chat/${params.id}`)
  }

  


  let bookmarks = { 'bookmarks' : {}};
  let feedbacks = { 'feedbacks' : {}};
  let chat = { 'messages': {}}
  let mode = process.env.PERSISTENCE_MODE;
  if (mode?.replace('"','') == 'supabase') 
  {
    chat = await getChatSupabase(params.id)
    if (!chat) {
      notFound()
    }
  
    if (chat?.userId !== session?.user?.id) {
      notFound()
    }
    bookmarks = await getBookmarksSupabase(session?.user?.id)
    feedbacks = await getFeedbacksSupabase(session?.user?.id)
  }

  // [Correcting the JSON object schema]
  // since the logic in the frontend needs the schema to be like { bookmarks: {} } or { feedbacks: {} or { messages : {}} }
  // And the Client API provides in a { ...messages } format
  else if (mode?.replace('"','') == 'local'){
    // correcting the [chat] schema
    chat = await getChatlocal(params.username)
    let temp_response_chat = await getChatLocal(session?.user?.email)
    if (!temp_response_chat.hasOwnProperty('messages')) chat = { 'messages': temp_response_chat}
    else chat = await getChatLocal(session?.user?.email)
    if (!chat) {
      notFound()
    }
    // correcting the [bookmarks] schema
    let temp_response_bookmarks = await getBookmarksLocal(session?.user?.email)
    if (!temp_response_bookmarks.hasOwnProperty('bookmarks')) bookmarks = { 'bookmarks': temp_response_bookmarks}
    else bookmarks = await getBookmarksLocal(session?.user?.email)
    // correcting the [feedbacks] schema
    let temp_response_feedbacks = await getFeedbacksLocal(session?.user?.email)
    if (!temp_response_feedbacks.hasOwnProperty('feedbacks')) feedbacks = { 'feedbacks': temp_response_feedbacks}
    else feedbacks = await getFeedbacksLocal(session?.user?.email)
  } 
  return <Chat id={session?.user?.email} initialMessages={chat.messages} username={session?.user?.email} bookmarks={bookmarks} feedbacks={feedbacks} bookmark_page={false} />
}
