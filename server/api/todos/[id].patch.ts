import { updateTodo } from '../../utils/notion'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const statuses = ['未着手', '進行中', '保留中', '完了', '中止']
  const priorities = ['A: 重要度高 緊急度高', 'B: 重要度高 緊急度低', 'C: 重要度低 緊急度高', 'D: 重要度低 緊急度低']
  if (!body || Object.keys(body).length === 0) throw createError({ statusCode: 400, statusMessage: 'update values are required' })
  if (body.status !== undefined && !statuses.includes(body.status)) throw createError({ statusCode: 400, statusMessage: 'invalid status' })
  if (body.priority !== undefined && body.priority !== null && !priorities.includes(body.priority)) throw createError({ statusCode: 400, statusMessage: 'invalid priority' })
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) throw createError({ statusCode: 400, statusMessage: 'invalid title' })
  if (body.memo !== undefined && typeof body.memo !== 'string') throw createError({ statusCode: 400, statusMessage: 'invalid memo' })
  if (body.projectId !== undefined && body.projectId !== null && typeof body.projectId !== 'string') throw createError({ statusCode: 400, statusMessage: 'invalid project' })
  const input: Parameters<typeof updateTodo>[1] = {}
  if (body.title !== undefined) input.title = body.title
  if (body.status !== undefined) input.status = body.status
  if (body.priority !== undefined) input.priority = body.priority
  if (body.memo !== undefined) input.memo = body.memo
  if (body.projectId !== undefined) input.projectId = body.projectId || null
  return updateTodo(getRouterParam(event, 'id')!, input)
})
