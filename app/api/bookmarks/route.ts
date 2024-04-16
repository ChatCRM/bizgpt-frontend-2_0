import 'server-only'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'
import { auth, authUser } from '@/auth'
import { NextResponse } from "next/server";

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const json = await req.json()
  let mode = json.mode
  const cookieStore = cookies()
  const userId = (await authUser())?.user.id
  const userName = (await authUser())?.user.email

  if (mode?.replace('"','') == "supabase") {
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore
    })
    const id = userId
    const user_id = userId
    const payload = { bookmarks: json.data }
    if (!userId) {
      return new Response('Unauthorized', {
        status: 401
      })
    }
    await supabase.from('bookmarks').upsert({ id, user_id, payload }).throwOnError()
  }
  else if (mode?.replace('"','') == "local") {
    const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_BOOKMARK_PERSIST_PATH}`
    const payload = { "streamlit_element_key_id": json?.state_diff?.index, 'is_bookmarked': json?.state_diff?.bookmark_state, 'username': userName };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': "application/json", 'Authorization': `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}` },
      body: JSON.stringify(payload)
    }
    )
    if(process.env.DEBUG_MODE) console.log(await res.json(), res.status)
  }
  // to thelp resolve the error: Cannot read properties of undefined (reading 'headers')
  return NextResponse.json({ message: 'good', success: true });
}
