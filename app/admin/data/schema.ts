import { z } from "zod"

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.number(),
  datetime_added: z.string(),
  id_inserted: z.string(),
  document: z.string(),
  metadata: z.string(),
})

export type Task = z.infer<typeof taskSchema>
