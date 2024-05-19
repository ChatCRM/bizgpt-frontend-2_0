//@ts-nocheck
'use server'
import 'server-only'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import { type Chat } from '@/lib/types'
import { auth } from '@/auth'
import { PostgrestError } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

export async function getOrganizationId(){
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
  
  const organizations = await supabase.from('orgs').select('id').eq('name', process.env.BIZGPT_ORGANIZATION)

  if (organizations) return organizations.data[0].id
  else throw new Error("Organization not found!");
}

export async function getUserIdByEmail(email: string){
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  for (const user of users)
    if( user.email == email)
      return user.id
}

export async function getUserRoleTable(): Promise<any> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: process.env.BIZGPT_ORGANIZATION } 
  })

  const role_data = await supabase.from('user_bizgpt_role').select('id, user, role, orgs (name)').order('id', { ascending: true })
  const user_role = []
  for (const user of role_data.data){
    const user_auth = await supabase.auth.admin.getUserById(user.user)
    if (user.orgs.name == process.env.BIZGPT_ORGANIZATION)
      user_role.push(
        {
          id: user.id,
          email: user_auth.data.user.email,
          role: user.role,
          org: user.orgs.name,
          isUser: null // used in the conext of the User-Role table. To help identify the user and prevent displaying the "Role Dropdown".
        }
      )
  }
  return user_role
}

export async function getVectorDataLogLocal(): Promise<JSON> {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_ADMIN_RETRIEVE_VECTOR_LOG}`
  let output;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`,
      'Content-Type': 'application/json'
    },
    next: { revalidate: 0 }
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch/retrieve vector-log data - The main component')
  }
  output = await res.json();
  return output
}


export async function getFeedbacksLocalAdmin(): Promise<JSON> {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_FEEDBACK_ADMIN_RETRIEVE_PATH}`
  console.log(url)
  let output;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`,
      'Content-Type': 'application/json'
    },
    next: { revalidate: 5, tags: ['feedbacks-detail-cache'] }
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch/retrieve feedback (admin-detail) data - The main component')
  }
  output = await res.json();
  console.log(output)
  return output
}
