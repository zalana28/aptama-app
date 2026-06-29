import { useContext } from 'react'
import { AdminContext } from './AdminContext'

export function useAdmin() {
  return useContext(AdminContext)
}
