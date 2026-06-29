import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAdmin } from './useAdmin'
import type { Attendance, AttendanceStatus } from '../types'

export function useAttendanceByEvent(eventId: string) {
  return useQuery({
    queryKey: ['attendance', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_public')
        .select('*')
        .eq('event_id', eventId)
      if (error) throw error
      return (data ?? []) as Attendance[]
    },
    enabled: !!eventId,
  })
}

/**
 * Ketua-only: ambil attendance dengan kolom `note` (alasan izin).
 * Memanggil RPC `admin_get_attendance` yang verify PIN server-side.
 * Hanya enabled jika user adalah admin DAN PIN ada di localStorage.
 */
export function useAdminAttendanceByEvent(eventId: string) {
  const { isAdmin } = useAdmin()
  return useQuery({
    queryKey: ['admin_attendance', eventId, isAdmin],
    queryFn: async () => {
      const pin = localStorage.getItem('aptama_admin_pin')
      if (!pin) throw new Error('PIN admin belum diset')
      const { data, error } = await supabase.rpc('admin_get_attendance', {
        p_event_id: eventId,
        p_pin: pin,
      })
      if (error) throw error
      return (data ?? []) as Attendance[]
    },
    enabled: !!eventId && isAdmin,
  })
}

export function useUpsertAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      event_id,
      member_id,
      status,
      note,
    }: {
      event_id: string
      member_id: string
      status: AttendanceStatus
      note?: string
    }) => {
      const { data, error } = await supabase
        .from('attendances')
        .upsert(
          { event_id, member_id, status, note } as never,
          { onConflict: 'event_id,member_id' },
        )
        .select()
        .single()
      if (error) throw error
      return data as Attendance
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['attendance', vars.event_id] })
      qc.invalidateQueries({ queryKey: ['admin_attendance', vars.event_id] })
    },
  })
}

export function useEventRecap() {
  return useQuery({
    queryKey: ['event_recap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_recap')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useMemberRecap() {
  return useQuery({
    queryKey: ['member_recap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_recap')
        .select('*')
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}
