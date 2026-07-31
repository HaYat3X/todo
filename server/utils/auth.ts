import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'task_board_session'
const MAX_AGE = 60 * 60 * 24 * 7
const config = () => ({ password:process.env.APP_PASSWORD, secret:process.env.AUTH_SECRET })
const signature = (payload:string, secret:string) => createHmac('sha256',secret).update(payload).digest('base64url')
export function isAuthenticated(event:any) { const {secret}=config();const cookie=getCookie(event,COOKIE);if(!secret||!cookie) return false;const [issuedAt,providedSignature]=cookie.split('.');if(!issuedAt||!providedSignature||Date.now()-Number(issuedAt)>MAX_AGE*1000) return false;const expected=signature(issuedAt,secret);return providedSignature.length===expected.length&&timingSafeEqual(Buffer.from(providedSignature),Buffer.from(expected)) }
export function verifyPassword(password:string) { const expected=config().password;if(!expected||password.length!==expected.length) return false;return timingSafeEqual(Buffer.from(password),Buffer.from(expected)) }
export function startSession(event:any) { const {secret}=config();if(!secret) throw createError({statusCode:500,statusMessage:'Authentication is not configured'});const issuedAt=String(Date.now());setCookie(event,COOKIE,`${issuedAt}.${signature(issuedAt,secret)}`,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:MAX_AGE}) }
export function endSession(event:any) { deleteCookie(event,COOKIE,{path:'/'}) }
export function requireAuth(event:any) { if(!isAuthenticated(event)) throw createError({statusCode:401,statusMessage:'Authentication required'}) }
