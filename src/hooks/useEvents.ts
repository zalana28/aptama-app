import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Event } from '../types'

function getAdminPin(): string {
  const pin = localStorage.getItem('aptama_admin_pin')
  if (!pin) throw new Error('PIN admin belum diset')
  return pin
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as Event[]
    },
  })
}

export function useAddEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (event: Omit<Event, 'id'>) => {
      const { data, error } = await supabase.rpc('admin_add_event', {
        p_pin: getAdminPin(),
        p_title: event.title,
        p_date: event.date,
        p_time: event.time ?? null,
        p_location: event.location ?? null,
        p_checkin_close_at: event.checkin_close_at ?? null,
      })
      if (error) throw error
      return { id: data as string, ...event } as Event
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { error } = await supabase.rpc('admin_update_event', {
        p_pin: getAdminPin(),
        p_event_id: id,
        p_title: updates.title ?? null,
        p_date: updates.date ?? null,
        p_time: updates.time ?? null,
        p_location: updates.location ?? null,
        p_checkin_close_at: updates.checkin_close_at ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_event', {
        p_pin: getAdminPin(),
        p_event_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
