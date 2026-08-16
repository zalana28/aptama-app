import { createContext, type ReactNode } from 'react'

export type LoginResult =
  | { ok: true }
  | { ok: false; errorCode: 'invalid_pin' | 'rate_limited' | 'error'; retryAfter?: number; message?: string }

export interface AdminCtx {
  isAdmin: boolean
  login: (pin: string) => Promise<LoginResult>
  logout: () => void
}

export const AdminContext = createContext<AdminCtx>({
  isAdmin: false,
  login: async () => ({ ok: false, errorCode: 'invalid_pin' }),
  logout: () => {},
})

export type { ReactNode }
