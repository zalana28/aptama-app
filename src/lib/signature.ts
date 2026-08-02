import { supabase } from './supabase'
import { getAdminToken } from './admin'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * Upload a signature PNG/WebP blob to the private `signatures` bucket.
 * Path shape is `checkin/<eventId>/<random>.png` — validated server-side.
 * Returns the storage path to pass to submit_attendance_with_signature.
 */
export async function uploadSignatureBlob(
  blob: Blob,
  eventId: string,
): Promise<string> {
  if (blob.size > MAX_SIZE_BYTES) {
    throw new Error('Ukuran tanda tangan terlalu besar. Maksimal 2 MB.')
  }
  const ext = blob.type === 'image/webp' ? 'webp' : 'png'
  const name = `checkin/${eventId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('signatures').upload(name, blob, {
    contentType: blob.type,
    upsert: false,
  })
  if (error) throw error
  return name
}

/**
 * Build a short-lived signed URL for a stored signature. Admin-only:
 * the path comes from get_signature_path (session-verified RPC), and the
 * storage SELECT policy only permits signed-URL generation for the folder.
 */
export async function getSignatureViewUrl(
  attendanceId: string,
): Promise<string | null> {
  const { data: path, error } = await supabase.rpc('get_signature_path', {
    p_token: getAdminToken(),
    p_attendance_id: attendanceId,
  })
  if (error || !path) return null
  const { data: signed } = await supabase.storage
    .from('signatures')
    .createSignedUrl(path as string, 60)
  return signed?.signedUrl ?? null
}
