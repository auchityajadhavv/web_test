export type DemoInput = {
  requestKey: string; name: string; venue: string; email: string;
  message: string; plan: string; website: string; token: string
}
const limits = { name: 100, venue: 160, email: 254, message: 2000, plan: 20, website: 200, token: 2048, requestKey: 36 }
export function validateDemoInput(value: unknown): DemoInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof record[field] !== 'string' || (record[field] as string).length > limit) return null
    result[field] = (record[field] as string).trim()
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result[field])) return null
  }
  if (!result.name || !result.venue || !result.message || !result.token || result.website) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || /[\r\n]/.test(result.email)) return null
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.requestKey)) return null
  if (!['', 'Starter', 'Growth', 'Managed'].includes(result.plan)) return null
  return result as DemoInput
}
