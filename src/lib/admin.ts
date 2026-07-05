/** Shared utility: get admin PIN from session storage (never localStorage). */
export function getAdminPin(): string {
  const pin = sessionStorage.getItem('aptama_admin_pin')
  if (!pin) throw new Error('PIN admin belum diset')
  return pin
}
