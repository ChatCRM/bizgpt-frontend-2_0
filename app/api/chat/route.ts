// @ts-nocheck
import 'server-only'
import { assistantId } from '@/app/assistant-config'
import { createClientSchema } from '@/utils/supabase/server'
import { generateUUID } from '@/lib/utils'

export const maxDuration = 120
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createClientSchema()
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = json.user_id

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const response = await fetch(
      'https://gateway.openairan.info/proxy-openai',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
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
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const pattern = /【\d+:\d+†source】/g
    let final_answer = ''
    const decoder = new TextDecoder()
    const reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const events = text.split('\n\n').filter(Boolean)

      for (const event of events) {
        const lines = event.split('\n')
        const eventData = {}

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventData.event = line.slice(7)
          } else if (line.startsWith('data: ')) {
            try {
              eventData.data = JSON.parse(line.slice(6))
            } catch (e) {
              // console.error('Failed to parse JSON:', e)
              continue
            }
          }
        }

        if (eventData.event === 'thread.message.completed') {
          const data = eventData.data
          final_answer = data.content[0].text.value
          final_answer = final_answer.replace(pattern, '')

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
    }

    // Return only the final answer as a regular Response
    return new Response(final_answer, {
      headers: { 'Content-Type': 'text/plain' }
    })
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
