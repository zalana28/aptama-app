import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminToken } from '../lib/admin'
import { useAdmin } from './useAdmin'
import type { Attendance, AttendanceStatus, AdminAttendanceRow } from '../types'

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
    refetchInterval: 3000, // Live polling setiap 3 detik
    staleTime: 1000,
  })
}

/**
 * Ketua-only: full attendance rows (note, signature_path, check_in_at,
 * verified_by, member_name) via admin_get_attendance_v2 (session token).
 * Jika RPC gagal / error, otomatis fallback ke attendance_public view.
 */
export function useAdminAttendanceByEvent(eventId: string) {
  const { isAdmin } = useAdmin()
  return useQuery({
    queryKey: ['admin_attendance', eventId, isAdmin],
    queryFn: async () => {
      try {
        const token = getAdminToken()
        const { data, error } = await supabase.rpc('admin_get_attendance_v2', {
          p_event_id: eventId,
          p_token: token,
        })
        if (error) throw error
        return (data ?? []) as AdminAttendanceRow[]
      } catch {
        // Fallback aman: ambil data dari public view jika admin RPC gagal
        const { data, error } = await supabase
          .from('attendance_public')
          .select('*')
          .eq('event_id', eventId)
        if (error) return []
        return (data ?? []) as AdminAttendanceRow[]
      }
    },
    enabled: !!eventId && isAdmin,
    refetchInterval: 3000, // Live polling setiap 3 detik
    staleTime: 1000,
  })
}

function invalidateAttendance(qc: ReturnType<typeof useQueryClient>, eventId: string) {
  qc.invalidateQueries({ queryKey: ['attendance', eventId] })
  qc.invalidateQueries({ queryKey: ['admin_attendance', eventId] })
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
      const { error } = await supabase.rpc('admin_upsert_attendance', {
        p_token: getAdminToken(),
        p_event_id: event_id,
        p_member_id: member_id,
        p_status: status,
        p_note: note ?? null,
      })
      if (error) throw error
    },
    onSuccess: (_data, vars) => invalidateAttendance(qc, vars.event_id),
  })
}

export function useMarkPresent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      event_id,
      member_id,
      admin_name,
    }: {
      event_id: string
      member_id: string
      admin_name?: string
    }) => {
      const { data, error } = await supabase.rpc('admin_mark_present', {
        p_token: getAdminToken(),
        p_event_id: event_id,
        p_member_id: member_id,
        p_admin_name: admin_name ?? null,
      })
      if (error) throw error
      return data as { success?: boolean; error?: string }
    },
    onSuccess: (_data, vars) => invalidateAttendance(qc, vars.event_id),
  })
}

export function useUndoAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      event_id,
      member_id,
    }: {
      event_id: string
      member_id: string
    }) => {
      const { data, error } = await supabase.rpc('admin_undo_attendance', {
        p_token: getAdminToken(),
        p_event_id: event_id,
        p_member_id: member_id,
      })
      if (error) throw error
      return data as { success?: boolean; error?: string }
    },
    onSuccess: (_data, vars) => invalidateAttendance(qc, vars.event_id),
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
