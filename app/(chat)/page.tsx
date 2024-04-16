// @ts-nocheck 
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
  let chat = { 'messages': {}, 'id': undefined, 'userId': session?.user?.id }
  let mode = process.env.PERSISTENCE_MODE;
  if (mode?.replace('"', '') == 'supabase') {
    bookmarks = await getBookmarksSupabase(session?.user?.id)
    feedbacks = await getFeedbacksSupabase(session?.user?.id)
  }

  // [Correcting the JSON object schema]
  // since the logic in the frontend needs the schema to be like { bookmarks: {} } or { feedbacks: {} or { messages : {}} }
  // And the Client API provides in a { ...messages } format
  else if (mode?.replace('"', '') == 'local') {
    // Correcting the [bookmarks] schema
    let temp_response_bookmarks = await getBookmarksLocal(session?.user?.email)
    if (!temp_response_bookmarks.hasOwnProperty('bookmarks')) bookmarks = { 'bookmarks': temp_response_bookmarks }
    else bookmarks = await getBookmarksLocal(session?.user?.email)
    // Correcting the [feedbacks] schema
    let temp_response_feedbacks = await getFeedbacksLocal(session?.user?.email)
    if (!temp_response_feedbacks.hasOwnProperty('feedbacks')) feedbacks = { 'feedbacks': temp_response_feedbacks }
    else feedbacks = await getFeedbacksLocal(session?.user?.email)
  }

  if (session?.user?.id && mode?.replace('"', '') == 'supabase') {
    chat = await getChatSupabase(session?.user?.id)
    return <Chat id={session?.user?.id} username={session?.user?.email} initialMessages={chat?.messages} bookmarks={bookmarks} feedbacks={feedbacks} />
  }
  else if (session?.user?.id && mode?.replace('"', '') == 'local') {
    let temp_response_chat = await getChatLocal(session?.user?.email)
    if (!temp_response_chat.hasOwnProperty('messages')) chat = { 'messages': temp_response_chat }
    else chat = await getChatLocal(session?.user?.email)
    return <Chat id={id} username={session?.user?.email} initialMessages={chat.messages} bookmarks={bookmarks} feedbacks={feedbacks} />
  }

  return (
    <div>
      <Chat id={id} username={session?.user?.email} bookmarks={bookmarks} feedbacks={feedbacks} bookmark_page={false} />
    </div>)
}
