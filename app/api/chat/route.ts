// @ts-nocheck
import 'server-only'
import { assistantId } from '@/app/assistant-config'
import { StreamingTextResponse } from 'ai'
import { createClientSchema } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { generateUUID } from '@/lib/utils'
import { Readable } from 'stream'

export const maxDuration = 120
export const runtime = 'nodejs'

async function createReadableStream(response) {
  const reader = response.body.getReader()
  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }
      } finally {
        reader.releaseLock()
        controller.close()
      }
    }
  })
}

export async function POST(req: Request) {
  const supabase = createClientSchema()
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = json.user_id

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const response = await fetch('http://localhost:3131/proxy-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        temperature: 0,
        thread: {
          messages: messages
        },
        stream: true,
        tool_resources: {
          file_search: { vector_store_ids: ['vs_gPCtwiyn0sYXrdGHIpXrHVh9'] }
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const pattern = /【\d+:\d+†source】/g
    let final_answer = ''

    // Create a TransformStream to process the chunks
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk)
        try {
          const events = text.split('\n\n').filter(Boolean)
          // console.log(`events is: ${events}`)

          for (const event of events) {
            // console.log(`event is: ${event}`)
            const lines = event.split('\n')
            const eventData = {}
            for (const line of lines) {
              // console.log(`Line is: ${line}`)
              if (line.startsWith('event: ')) {
                // console.log(`event is: ${line.slice(7)}`)
                eventData.event = line.slice(7) // Remove 'event: '
              } else if (line.startsWith('data: ')) {
                try {
                  eventData.data = JSON.parse(line.slice(6)) // Remove 'data: '
                  // console.log(`data is: ${line.slice(6)}`)
                } catch (e) {
                  console.error('Failed to parse JSON:', e)
                  continue
                }
              }
            }

            if (eventData.event === 'thread.message.completed') {
              const data = eventData.data
              // console.log(`data is: ${data}`)
              final_answer = data.content[0].text.value
              final_answer = final_answer.replace(pattern, '')
              // console.log(`Final answer is: ${final_answer}`)

              // Save to database
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
                    content: final_answer,
                    role: 'assistant'
                  }
                ]
              }

              // Update or insert chat record
              const { data: record } = await supabase
                .from('chats')
                .select('*')
                .eq('chat_id', json.id)
                .maybeSingle()
                .throwOnError()

              if (record?.id) {
                await supabase
                  .from('chats')
                  .update({ payload })
                  .eq('chat_id', json.id)
              } else {
                await supabase
                  .from('chats')
                  .insert({ chat_id: id, user_id: userId, payload })
              }
            }
          }
          // console.log(`Chunk is: ${chunk}`)
          controller.enqueue(chunk)
        } catch (error) {
          console.error('Error processing chunk:', error)
          controller.error(error)
        }
      }
    })

    // Create a readable stream from the response
    const readable = await createReadableStream(response)

    // Pipe through the transform stream
    const transformedStream = readable.pipeThrough(transformStream)

    const res = new StreamingTextResponse(transformedStream)
    console.log(`Final answer is: ${final_answer}`)
    return res
    // const stream_readable = new ReadableStream({
    //   start(controller) {
    //     // Convert the text message to a Uint8Array and enqueue it
    //     const encoder = new TextEncoder()
    //     const chunk = encoder.encode(final_answer)

    //     // Enqueue the chunk
    //     controller.enqueue(chunk)

    //     // Close the stream
    //     controller.close()
    //   }
    // })

    // return new StreamingTextResponse(stream_readable)
  } catch (error) {
    console.error('Error in POST handler:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
