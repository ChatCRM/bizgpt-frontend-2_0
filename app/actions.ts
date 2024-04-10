'use server'
import 'server-only'
import { createClient, createClientSchema } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
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

export async function getChat(id: string) {
  const supabase = createClientSchema()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('id', id)
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
    .eq('id', id)
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
  console.log('haha')
  const { data: chat } = await supabase
  .from('chats')
  .select('payload')
  .eq('id', id)
  .maybeSingle()

  console.log(chat?.payload.title)


  const payload = {
    ...chat?.payload
  }
  payload.title = name

  await supabase
    .from('chats')
    .update({ payload: payload})
    .eq('id', id)
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
