import 'server-only'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  // Remember to enforce type here and after use some lib like zod.js to check it
  const files = formData.getAll('file') as File[]
  const file_name = formData.getAll('file_name')

  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_ADMIN_MARKDOWN_INSERT}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`
    },
    body: formData
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to POST Markdown-Upload data - The main component')
  }
  // const output = await res.json();
  if (process.env.DEBUG_MODE) console.log(await res.json(), res.status)
  return NextResponse.json({  status: await res.status })
}
