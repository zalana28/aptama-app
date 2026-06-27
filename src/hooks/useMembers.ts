import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Member } from '../types'

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
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
      const { data, error } = await supabase
        .from('members')
        .insert(member as never)
        .select()
        .single()
      if (error) throw error
      return data as Member
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase
        .from('members')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Member
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('members').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}
