// @ts-nocheck 
import { nanoid } from '@/lib/utils'
import { Bookmarks } from '@/components/original-chat/bookmarks'
import { auth, authUser } from '@/auth'
import { cookies } from 'next/headers'
import { getAllBookmarksSupabase,  getAllChatSupabaseUserId } from '@/app/actions'
import { type Chat } from '@/lib/types'

export const runtime = 'nodejs'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic';

async function getBookmarkedMessages(chat: Chat, bookmarks: JSON){
  let bookmarked_messages = { messages : []};
  if (bookmarks)
  for (var key of Object.keys(bookmarks?.bookmarks)){
    if (bookmarks?.bookmarks[key]?.bookmark){
        let index = Number(key.replace('bookmark_',''))
        let index_1;
        let index_2;
        index_1 = (index * 2) - 2
        index_2 = (index * 2) - 1
        chat.messages[index_1] ? bookmarked_messages.messages.push(chat.messages[index_1]) : console.log("messages for index ", index_1,' is undefined')
        chat.messages[index_2] ? bookmarked_messages.messages.push(chat.messages[index_2]) : console.log("messages for index ", index_2,' is undefined')
    }
  }

  return bookmarked_messages
}

export default async function BookmarksPage() {
  const cookieStore = cookies()
  const session = await authUser()
  let bookmarks = { 'bookmarks' : {}};
  let chat = { 'messages': {}}
  chat = await getAllChatSupabaseUserId(session?.user?.id)

  let mode = process.env.PERSISTENCE_MODE;
  if (mode?.replace('"','') == 'supabase') 
  {
    bookmarks = await getAllBookmarksSupabase(session?.user?.id)

  }

  // [Correcting the JSON object schema]
  // since the logic in the frontend needs the schema to be like { bookmarks: {} } or { feedbacks: {} or { messages : {}} }
  // And the Client API provides in a { ...messages } format
  else if (mode?.replace('"','') == 'local'){
    // Correcting the [bookmarks] schema
    let temp_response_bookmarks = await getBookmarksLocal(session?.user?.email)
    if (!temp_response_bookmarks.hasOwnProperty('bookmarks')) bookmarks = { 'bookmarks': temp_response_bookmarks}
    else bookmarks = await getBookmarksLocal(session?.user?.email)
  } 
  
  if (session?.user?.id && mode?.replace('"','') == 'supabase') {
    const bookmarked_messages = await getBookmarkedMessages(chat, bookmarks)
    return <Bookmarks id={session?.user?.id} username={session?.user?.email} initialMessages={bookmarked_messages.messages} bookmarks={undefined} feedbacks={undefined} bookmark_page={true} />
  }
      // Correcting the [chat] schema
  else if (session?.user?.id && mode?.replace('"','') == 'local'){
    const bookmarked_messages = await getBookmarkedMessages(chat, bookmarks)
    return <Bookmarks id={session?.user?.id} username={session?.user?.email} initialMessages={bookmarked_messages.messages} bookmarks={undefined} feedbacks={undefined} bookmark_page={true} />
  } 

}
