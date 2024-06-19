'use server'
import 'server-only'
import { createClient, createClientSchema } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { authUser } from '@/auth'
import { type Chat } from '@/lib/types'


import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { createClient as redisClient } from 'redis';

export async function openAIInteraction(userId?: string | null) {
const supabase_client_non_schema = createClient()
const supabase_client_with_schema = createClientSchema()
}
