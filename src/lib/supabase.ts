import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Strip trailing /rest/v1 if user accidentally includes it
const url = rawUrl.replace(/\/rest\/v1\/?$/, '')

export const isConfigured = !!(url && key)

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder',
)
