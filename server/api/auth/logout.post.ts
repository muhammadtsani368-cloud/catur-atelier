import { clearSessionCookiesOnEvent } from '../../utils/googleAuth'

export default defineEventHandler((event) => {
  clearSessionCookiesOnEvent(event)
  return { ok: true }
})
