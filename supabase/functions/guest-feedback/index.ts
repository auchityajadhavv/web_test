import { createClient } from 'npm:@supabase/supabase-js@2.110.5'
import { createGuestHandler } from './handler.ts'

const get = (name: string) => Deno.env.get(name) || ''
const origins = (get('GUEST_ALLOWED_ORIGINS') || get('DEMO_ALLOWED_ORIGINS')).split(',').map(value => value.trim()).filter(Boolean)
const configured = Boolean(get('SUPABASE_URL') && get('SUPABASE_SERVICE_ROLE_KEY') && get('GUEST_RATE_SALT').length >= 32 && origins.length)
const db = configured ? createClient(get('SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }) : null
const hash = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(byte => byte.toString(16).padStart(2, '0')).join('')

Deno.serve(createGuestHandler({
  origins,
  configured,
  async getConfig(code) {
    const { data, error } = await db!.from('stand_public_codes').select(`
      code, active,
      stands!inner(label,status,
        businesses!inner(name,logo_url,primary_color,accent_color,review_url,active),
        locations!inner(name,active)
      )
    `).eq('code', code).eq('active', true).eq('stands.status', 'active').eq('stands.businesses.active', true).eq('stands.locations.active', true).maybeSingle()
    if (error) throw new Error('config failed')
    if (!data) return null
    const stand = Array.isArray(data.stands) ? data.stands[0] : data.stands
    const business = Array.isArray(stand.businesses) ? stand.businesses[0] : stand.businesses
    const location = Array.isArray(stand.locations) ? stand.locations[0] : stand.locations
    return {
      businessName: business.name,
      locationName: location.name,
      standLabel: stand.label,
      logoUrl: business.logo_url,
      primaryColor: business.primary_color,
      accentColor: business.accent_color,
      reviewUrl: business.review_url,
    }
  },
  async submit(code, ip, input) {
    const { data, error } = await db!.rpc('submit_guest_feedback', {
      p_code: code,
      p_ip_hash: await hash(`${get('GUEST_RATE_SALT')}:${ip}`),
      p_answers: { service: input.service, quality: input.quality, overall: input.overall },
      p_comment: input.comment,
    })
    if (error) {
      if (error.message?.includes('rate limited')) throw new Error('rate limited')
      throw new Error('submit failed')
    }
    return data as string
  },
  async markReviewClick(code, feedbackId) {
    const { error } = await db!.rpc('mark_review_click', { p_code: code, p_feedback_id: feedbackId })
    if (error) throw new Error('mark failed')
  },
}))
