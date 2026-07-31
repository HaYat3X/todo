import { createTodo } from '../../utils/notion'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.title || typeof body.title !== 'string') throw createError({ statusCode: 400, statusMessage: 'title is required' })
  return createTodo({ title: body.title, priority: body.priority ?? null, memo: body.memo ?? '', projectId: body.projectId || null })
})
