import { requireAuth } from '../utils/auth'

export default defineEventHandler((event) => { if (event.path.startsWith('/api/') && !event.path.startsWith('/api/auth/')) requireAuth(event) })
