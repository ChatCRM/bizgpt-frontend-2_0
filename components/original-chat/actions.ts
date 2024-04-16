//@ts-nocheck
'use server'
import 'server-only'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import { type Chat } from '@/lib/types'
import { auth } from '@/auth'

export async function getUserRole(id: string | undefined): Promise<any> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
  const role_data = await supabase
    .from('user_bizgpt_role')
    .select('role')
    .eq('user', id).maybeSingle()

  return role_data.data?.role
}


export async function getBookmarkedMessagesSupabase(id: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
  const { data } = await supabase
    .from('bookmarks')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  return (data?.payload) ?? null
}

export async function getFeedbacksSupabase(id: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
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

export async function getFeedbacksLocal(username: string): Promise<JSON> {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_FEEDBACK_RETRIEVE_PATH}`
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
    next: { revalidate: 5, tags: ['feedbacks-cache'] }
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch/retrieve feedback data - The main component')
  }
  output = await res.json();
  return output
}


export async function getChatLocal(username: string) {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_MESSAGES_RETRIEVE_PATH}`
  const payload = { 'username': username };
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
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: { schema: process.env.BIZGPT_ORGANIZATION } 
    })
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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}


export async function removeChat({ id, path }: { id: string; path: string }) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: { schema: process.env.BIZGPT_ORGANIZATION } 
    })
    await supabase.from('chats').delete().eq('id', id).throwOnError()

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
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: { schema: process.env.BIZGPT_ORGANIZATION } 
    })
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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
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

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
  await supabase
    .from('chats')
    .update({ payload: payload as any })
    .eq('id', chat.id)
    .throwOnError()

  return payload
}
