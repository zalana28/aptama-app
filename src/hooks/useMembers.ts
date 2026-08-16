import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminToken } from '../lib/admin'
import type { Member } from '../types'

export interface AdminMember extends Member {
  phone?: string
  created_at?: string
}

export type MemberInput = { name: string; group?: string; phone?: string }

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members_public')
        .select('id, name, group')
        .order('name')
      if (error) throw error
      return (data ?? []) as Member[]
    },
  })
}

export function useAdminMembers() {
  return useQuery({
    queryKey: ['admin-members'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('admin_get_members', {
          p_token: getAdminToken(),
        })
        if (!error && Array.isArray(data)) return data as AdminMember[]
      } catch {
        // If admin RPC is unavailable or token fails, fallback to public view
      }
      const { data, error } = await supabase
        .from('members_public')
        .select('id, name, group')
        .order('name')
      if (error) {
        // Direct query fallback on members table
        const { data: directData } = await supabase
          .from('members')
          .select('id, name, group')
          .order('name')
        return (directData ?? []) as AdminMember[]
      }
      return (data ?? []) as AdminMember[]
    },
  })
}

export function useAddMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (member: MemberInput) => {
      const { data, error } = await supabase.rpc('admin_add_member', {
        p_token: getAdminToken(),
        p_name: member.name,
        p_group: member.group ?? null,
        p_phone: member.phone ?? null,
      })
      if (error) throw error
      return { id: data as string, ...member } as Member
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['admin-members'] })
    },
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: MemberInput & { id: string }) => {
      const { error } = await supabase.rpc('admin_update_member', {
        p_token: getAdminToken(),
        p_member_id: id,
        p_name: updates.name ?? null,
        p_group: updates.group ?? null,
        p_phone: updates.phone ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['admin-members'] })
    },
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_member', {
        p_token: getAdminToken(),
        p_member_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['admin-members'] })
    },
  })
}
