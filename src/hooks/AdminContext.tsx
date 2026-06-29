import { createContext, type ReactNode } from 'react'

export interface AdminCtx {
  isAdmin: boolean
  login: (pin: string) => Promise<boolean>
  logout: () => void
}

export const AdminContext = createContext<AdminCtx>({
  isAdmin: false,
  login: async () => false,
  logout: () => {},
})

export type { ReactNode }
