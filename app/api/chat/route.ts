// @ts-nocheck

import 'server-only'
import { OpenAIStream, StreamingTextResponse } from 'ai'
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClientSchema } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'

import { auth, authUser } from '@/auth'
import { nanoid, generateUUID } from '@/lib/utils'

export const maxDuration = 120
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createClientSchema()
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = json.user_id
  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  if (previewToken) {
    configuration.apiKey = previewToken
  }

  const mode = process.env.PERSISTENCE_MODE
  const userName = json.username
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_MESSAGES_SUBMIT_PATH}`
  const index = Math.round(json.messages.length / 2)
  const payload = {
    username: userName,
    streamlit_element_key_id: String(index),
    question_text: json.messages.at(-1).content,
    chat_id: json.id,
    user_id: json.user_id
  }
  var res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`
    },
    body: JSON.stringify(payload)
  })
  res = await res.text()
  console.log(`Request object is ${res}`)
  // res = res['data']['response']

  // console.log(`Request object is ${res}`)

  const title = json.messages[0].content.substring(0, 100)
  const id = json.id ?? generateUUID()
  const createdAt = Date.now()
  const path = `/chat/${id}`
  const payload_res = {
    id,
    title,
    userId,
    createdAt,
    path,
    messages: [
      ...messages,
      {
        content: res,
        role: 'assistant'
      }
    ]
  }
  // Insert chat into database.
  const { data: record, error: record_error } = await supabase
    .from('chats')
    .select('*')
    .eq('chat_id', json.id)
    .maybeSingle()
    .throwOnError()

  if (record?.id) {
    await supabase
      .from('chats')
      .update({ payload: payload_res })
      .eq('chat_id', json.id)
  } else {
    console.log(
      `payload is ${payload_res.messages[0]['content']}. and userId is ${userId} and chatId is ${id}.`
    )
    try {
      final_res = await supabase
        .from('chats')
        .insert({ chat_id: id, user_id: userId, payload: payload_res })
      console.log(`Final Response: ${final_res}`)
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error occurred: ${error.message}`)
      } else {
        console.error('Unknown error occurred')
      }
    }
  }

  // Create a readable stream from the text message
  const stream = new ReadableStream({
    start(controller) {
      // Convert the text message to a Uint8Array and enqueue it
      const encoder = new TextEncoder()
      const chunk = encoder.encode(res)

      // Enqueue the chunk
      controller.enqueue(chunk)

      // Close the stream
      controller.close()
    }
  })

  // const openAIStream = OpenAIStream(stream)

  return new StreamingTextResponse(stream)
}
