import { deleteTodo } from '../../utils/notion'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'todo id is required' })
  return deleteTodo(id)
})
