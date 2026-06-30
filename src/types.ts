export type AttendanceStatus = 'hadir' | 'izin' | 'alfa'
export type FaceStatus = 'none' | 'pending' | 'approved'
export type VerifiedStatus = 'auto' | 'manual' | 'pending'

export interface Member {
  id: string
  name: string
  group?: string
  phone?: string
  face_descriptor?: number[]
  face_status?: FaceStatus
  face_enrolled_at?: string
  face_selfie_url?: string
}

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
