import { redirect } from 'next/navigation'


export const runtime = 'nodejs'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';




export default async function AdminPage() {
  redirect('/admin/knowledgebase')
}
