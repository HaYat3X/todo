import { startSession, verifyPassword } from '../../utils/auth'
export default defineEventHandler(async (event) => { const body=await readBody(event);if(!verifyPassword(body?.password ?? '')) throw createError({statusCode:401,statusMessage:'Invalid password'});startSession(event);return {authenticated:true} })
