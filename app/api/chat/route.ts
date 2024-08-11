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

  // const content = question_text
  // console.log('content is: ' + question_text)
  // await openai.beta.threads.messages.create(threadId, {
  //   role: 'user',
  //   content: question_text
  // })
  const instructions = `
    شما در زمینه وکالت تخصص داری و باید تنها براساس داده های که در اختیارت قرار
    داده شده است تعیین کنی کدام قسمت ها برای جواب به سوالات مفید هستند.
    برای جواب به سوالات تنها قسمت هایی که به صورت داده در اختیارت قرار داده شده 
    را ذکر کن و از دادن جواب شخصی خودداری کن، تنها اطلاعاتی که برای جواب میتونه مفید باشه را نمایش بده
    At the end of your answer, give user information about the name of the files you used to provide the answers in the following format:
    'The following documents were referenced to generate the response: \n {filname} -> line numbers: {line number} \n'.
  `
  const stream = await openai.beta.threads.createAndRun({
    assistant_id: assistantId,
    instructions: instructions,
    temperature: 0,
    thread: {
      messages: messages
    },
    stream: true,
    tool_resources: {
      file_search: { vector_store_ids: ['vs_c8ThlMskfSg25FAP2Y1K1xiT'] }
    }
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
