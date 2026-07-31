import { isAuthenticated } from '../../utils/auth'
export default defineEventHandler((event) => ({ authenticated:isAuthenticated(event) }))
