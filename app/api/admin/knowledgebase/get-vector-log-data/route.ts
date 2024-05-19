import 'server-only'
import { NextResponse } from 'next/server'

// due to Vercel's: Deploying with 'edge' runtime to vercel results in a HTTP 500 error
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store';
export const dynamic = "force-dynamic";
export const revalidate = 0 
export const maxDuration = 60

export async function GET() {
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_ADMIN_RETRIEVE_VECTOR_LOG}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.BizGPT_CLIENT_API_TOKEN_FRONTEND}`
    },
    cache: 'no-store'
  })
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch/retrieve vector-log data - The main component')
  }
  const output = await res.json();
  if (process.env.DEBUG_MODE) console.log(output, res.status)
  return NextResponse.json(output)
}
