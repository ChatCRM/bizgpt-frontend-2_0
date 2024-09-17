// @ts-nocheck

import 'server-only'

import { assistantId } from '@/app/assistant-config'
import { openai } from '@/app/openai'

import { OpenAIStream, StreamingTextResponse } from 'ai'
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClientSchema } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'

import { auth, authUser } from '@/auth'
import { nanoid, generateUUID } from '@/lib/utils'
import { threadId } from 'worker_threads'

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
  console.log('messages are:' + JSON.stringify(messages))
  const question_text = messages.at(-1).content
  const payload = {
    username: userName,
    streamlit_element_key_id: String(index),
    question_text: question_text,
    chat_id: json.id,
    user_id: json.user_id
  }
  // const threadId = json.threadId
  // console.log(`ThreadId Is: ${threadId}`)
  console.log(`AssitatntId Is: ${assistantId}`)

  const content = question_text
  // console.log('content is: ' + question_text)
  // await openai.beta.threads.messages.create(threadId, {
  //   role: 'user',
  //   content: question_text
  // })
  const instructions = `
    You are an financhial assistant which can assist users about financial statements.
    Analyze the following pdf with with the id of 
    file-tgb9eZge2B8MgCfnmViz0hCO
    which is the financial statement of Noori company and the pdf file with the if of 
    file-pk590gOloxBreGJmxQbK5bXg which the financial statement of Booali company
    and answer questions about them. 
    In response, when the result is tabular use table markdown format
    You must return your answer only in Persian language.
  `
  const stream = await openai.beta.threads.createAndRun({
    assistant_id: assistantId,
    instructions: instructions,
    temperature: 0.2,
    stream: true,
    thread: {
      messages: [{ role: 'user', content: content }] //messages
    },
    tool_resources: {
      file_search: { vector_store_ids: ['vs_rDjOoBBDotfc2Uu6wTIKeqJa'] }
    }
    //   max_completion_tokens: 55000,
    //   max_prompt_tokens: 55000
  })
  const pattern = /【\d+:\d+†source】/g
  let final_answer = ''
  for await (const event of stream) {
    console.log(event)
    if (event.event == 'thread.message.completed') {
      final_answer = event.data.content[0].text.value
      console.log('final answer is:' + final_answer)
      const title = json.messages[0].content.substring(0, 100)
      const id = json.id ?? generateUUID()
      const createdAt = Date.now()
      const path = `/chat/${id}`
      const payload = {
        id,
        title,
        userId,
        createdAt,
        path,
        messages: [
          ...messages,
          {
            content: final_answer.replace(pattern, ''),
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
          .update({ payload: payload })
          .eq('chat_id', json.id)
      } else {
        await supabase
          .from('chats')
          .insert({ chat_id: id, user_id: userId, payload: payload })
      }
    }
  }

  final_answer = final_answer.replace(pattern, '')
  // Create a readable stream from the text message
  const stream_readable = new ReadableStream({
    start(controller) {
      // Convert the text message to a Uint8Array and enqueue it
      const encoder = new TextEncoder()
      const chunk = encoder.encode(final_answer)

      // Enqueue the chunk
      controller.enqueue(chunk)

      // Close the stream
      controller.close()
    }
  })

  return new StreamingTextResponse(stream_readable)

  // const stream_res = openai.beta.threads.runs
  //   .stream(threadId, {
  //     assistant_id: assistantId
  //   })
  //   .on('textDone', async (content: Text, snapshot: Message) => {
  //     console.log(`content: ${JSON.stringify(content, null, 4)}`)
  //     console.log(`Completion is: ${content.value}`)

  // return new Response(stream_res.toReadableStream())
  // return new StreamingTextResponse(stream_res)
}
