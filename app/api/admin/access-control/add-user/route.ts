//@ts-nocheck
import 'server-only'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { PostgrestError } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { getUserIdByEmail, getOrganizationId } from '@/app/admin/actions'


export const runtime = 'nodejs'

export async function POST(req: Request) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: { schema: process.env.BIZGPT_ORGANIZATION } 
    }
  )

  const json = await req.json()

  // Create Supabase user
  const { data, error } = await supabase.auth.admin.createUser({
    email: json.email,
    password: json.password,
    email_confirm : true
  })

  // Add the user to the 'user_bizgpt_role' table
  const org = await getOrganizationId()
  const user = await getUserIdByEmail(json.email)
  const role = json.role
  await supabase.from('user_bizgpt_role').insert({ user, role, org }).throwOnError()
  return NextResponse.json({ status: 200 })
}
