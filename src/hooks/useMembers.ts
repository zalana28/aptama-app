import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminPin } from '../lib/admin'
import type { Member } from '../types'

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members_public')
        .select('id, name, group, face_status, face_enrolled_at, phone')
        .order('name')
      if (error) throw error
      return (data ?? []) as Member[]
    },
  })
}

export function useAddMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (member: Omit<Member, 'id'>) => {
      const { data, error } = await supabase.rpc('admin_add_member', {
        p_pin: getAdminPin(),
        p_name: member.name,
        p_group: member.group ?? null,
        p_phone: member.phone ?? null,
      })
      if (error) throw error
      return { id: data as string, ...member } as Member
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Member> & { id: string }) => {
      const { error } = await supabase.rpc('admin_update_member', {
        p_pin: getAdminPin(),
        p_member_id: id,
        p_name: updates.name ?? null,
        p_group: updates.group ?? null,
        p_phone: updates.phone ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_member', {
        p_pin: getAdminPin(),
        p_member_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}
