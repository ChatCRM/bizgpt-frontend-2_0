'use server'
import 'server-only'
import { createClient, createClientSchema } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { authUser } from '@/auth'
import { type Chat } from '@/lib/types'

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }
  try {
    const supabase = createClientSchema()
    const { data } = await supabase
      .from('chats')
      .select('payload')
      .order('payload->createdAt', { ascending: false })
      .eq('user_id', userId)
      .throwOnError()
    return (data?.map(entry => entry.payload) as Chat[]) ?? []
  } catch (error) {
    return []
  }
}

export async function getAllChatSupabaseUserId(user_id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('user_id', user_id)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}

export async function getChat(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('chat_id', id)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await authUser()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }
  try {
    const supabase = createClientSchema()
    await supabase.from('chats').delete().eq('chat_id', id).throwOnError()

    revalidatePath('/')
    return revalidatePath(path)
  } catch (error) {
    return {
      error: 'Unauthorized'
    }
  }
}

  export async function clearChats() {
    const session = await authUser()
    try {
      const supabase = createClientSchema()
      await supabase.from('chats').delete().eq('user_id', session?.user?.id).throwOnError()
      return revalidatePath('/')
      // return redirect('/')
    } catch (error) {
      console.log('clear chats error', error)
      return {
        error: 'Unauthorized'
      }
    }
  }
  

export async function saveChat(chat: Chat) {
  const session = await authUser()

  if (session && session.user) {
    const supabase = createClientSchema()
    await supabase.from('chats').upsert({ id: chat.id, user_id: chat.userId, payload: chat }).throwOnError()
  } else {
    return
  }
}

export async function getSharedChat(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('chat_id', id)
    .not('payload->sharePath', 'is', null)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}

export async function shareChat(id: string) {
  const supabase = createClientSchema()

  const { data: chat } = await supabase
  .from('chats')
  .select('payload')
  .eq('id', id)
  .maybeSingle()

  const payload = {
    ...chat,
    sharePath: `/share/${id}`
  }

  // await supabase
  //   .from('chats')
  //   .update({ payload: payload})
  //   .eq('id', id)
  //   .throwOnError()
  if(chat)
    return chat.payload
  else
    return
}

export async function renameChat(id: string, name: string) {
  const supabase = createClientSchema()
  const { data: chat } = await supabase
  .from('chats')
  .select('payload')
  .eq('chat_id', id)
  .maybeSingle()

  const payload = {
    ...chat?.payload
  }
  payload.title = name

  await supabase
    .from('chats')
    .update({ payload: payload})
    .eq('chat_id', id)
    .throwOnError()
  if(chat)
    return chat.payload
  else
    return
}

export async function refreshHistory(path: string) {
  redirect(path)
}

export async function getMissingKeys() {
  const keysRequired = ['OPENAI_API_KEY']
  return keysRequired
    .map(key => (process.env[key] ? '' : key))
    .filter(key => key !== '')
}




// old-Chat components
export async function getUserRole(id: string | undefined): Promise<any> {
  const supabase = createClientSchema()
  const role_data = await supabase
    .from('user_bizgpt_role')
    .select('role')
    .eq('user', id).maybeSingle()

  return role_data.data?.role
}


export async function getBookmarkedMessagesSupabase(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('bookmarked_messages')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  return (data?.payload) ?? null
}


export async function submitFeedback(payload: object) {
  revalidateTag('feedbacks-cache')
}
export async function submitBookmark(payload: object) {
  revalidateTag('bookmarks-cache')
}
export async function getBookmarksSupabase(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('bookmarks')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  return (data?.payload) ?? null
}

export async function getFeedbacksSupabase(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('feedbacks')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  return (data?.payload) ?? null
}

export async function getBookmarksLocal(username: string): Promise<JSON> {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_BOOKMARK_RETRIEVE_PATH}`
  const payload = { 'username': username };
  let output;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    next: { revalidate: 5, tags: ['bookmarks-cache'] }
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch/retrieve bookmark data - The main component')
  }
  output = await res.json();
  return output
}

export async function getFeedbacksLocal(username: string, chat_id: string): Promise<JSON> {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_FEEDBACK_RETRIEVE_PATH}`
  const payload = { 'username': username, 'chat_id': chat_id };
  let output;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    next: { revalidate: 5, tags: ['feedbacks-cache'] }
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch/retrieve feedback data - The main component')
  }
  output = await res.json();
  return output
}


export async function getChatLocal(username: string, chat_id: string) {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_MESSAGES_RETRIEVE_PATH}`
  const payload = { 'username': username, 'chat_id': chat_id };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch/retrieve chat data - The main component')
  }
  const data = await res.json();

  return (data as Chat) ?? null
}

export async function getChatSupabase(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}