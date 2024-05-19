//@ts-nocheck
'use server'
import 'server-only'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { createClient, createClientSchema } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import { type Chat } from '@/lib/types'
import { auth } from '@/auth'

export async function getUserRole(id: string | undefined): Promise<any> {
  const supabase = createClientSchema()
  const role_data = await supabase
    .from('user_bizgpt_role')
    .select('role')
    .eq('user', id).maybeSingle()

  return role_data.data?.role
}

// deprecated
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

export async function getBookmarksSupabase(user_id: string, chat_id: string) {

  const supabase = createClientSchema()
  const { data } = await supabase
    .from('bookmarks')
    .select('payload')
    .eq('user_id', user_id)
    .eq('chat_id', chat_id)
    .maybeSingle()

  return (data?.payload) ?? null
}

export async function getAllBookmarksSupabase(user_id: string) {

  const supabase = createClientSchema()
  const { data } = await supabase
    .from('bookmarks')
    .select('payload')
    .eq('user_id', user_id)
    .maybeSingle()

  return (data?.payload) ?? null
}

export async function getFeedbacksSupabase(user_id: string, chat_id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('feedbacks')
    .select('payload')
    .eq('user_id', user_id)
    .eq('chat_id', chat_id)
    .maybeSingle()

  return (data?.payload) ?? null
}

export async function getAllFeedbacksSupabase(user_id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('feedbacks')
    .select('payload')
    .eq('user_id', user_id)
    .maybeSingle()

  return (data?.payload) ?? null
}

export async function getBookmarksLocal(username: string, chat_id: string): Promise<JSON> {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_BOOKMARK_RETRIEVE_PATH}`
  const payload = { 'username': username , 'chat_id': chat_id};
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
  const payload = { 'username': username , 'chat_id': chat_id};
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
  const payload = { 'username': username, "chat_id": chat_id };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    next: { cache: 'no-store'  }
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch/retrieve chat data - The main component')
  }
  const data = await res.json();

  return (data as Chat) ?? null
}

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

export async function getChatSupabase(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('chat_id', id)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}


export async function removeChat({ id, path }: { id: string; path: string }) {
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
  try {
    const supabase = createClientSchema()
    await supabase.from('chats').delete().throwOnError()
    revalidatePath('/')
    return redirect('/')
  } catch (error) {
    console.log('clear chats error', error)
    return {
      error: 'Unauthorized'
    }
  }
}

export async function getSharedChat(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('id', id)
    .not('payload->sharePath', 'is', null)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}

export async function shareChat(chat: Chat) {
  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  }

  const supabase = createClientSchema()
  await supabase
    .from('chats')
    .update({ payload: payload as any })
    .eq('id', chat.id)
    .throwOnError()

  return payload
}
