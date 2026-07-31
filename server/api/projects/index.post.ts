import { createProject } from '../../utils/notion'
export default defineEventHandler(async (event) => { const body=await readBody(event);if(!body?.name||typeof body.name!=='string') throw createError({statusCode:400,statusMessage:'name is required'});return createProject({name:body.name,fullName:body.fullName ?? ''}) })
