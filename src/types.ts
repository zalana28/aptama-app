// Public-safe member type — does NOT include biometric data (face_descriptor).
// Use this for all frontend reads. face_descriptor is only accessible
// via the server-side RPC `get_member_descriptor`.
export type AttendanceStatus = 'hadir' | 'izin' | 'alfa'
export type FaceStatus = 'none' | 'pending' | 'approved'
export type VerifiedStatus = 'auto' | 'manual' | 'pending'

export interface Member {
  id: string
  name: string
  phone?: string
  group?: string
  face_status?: FaceStatus
  face_enrolled_at?: string
}

export interface MemberAdmin extends Member {}

export interface Event {
  id: string
  title: string
  date: string
  time?: string
  location?: string
  checkin_close_at?: string
  checkin_token?: string
  checkin_expires_at?: string
}

export interface Attendance {
  id: string
  event_id: string
  member_id: string
  status: AttendanceStatus
  note?: string
  selfie_url?: string
  device_hash?: string
  face_match_score?: number
  verified_status: VerifiedStatus
  submitted_at?: string
}
