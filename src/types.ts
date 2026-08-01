export type AttendanceStatus = 'hadir' | 'izin' | 'alfa'

export type AttendanceSource = 'member_signature' | 'admin_manual' | 'izin' | 'legacy'

export interface Member {
  id: string
  name: string
  group?: string
}

export interface MemberPublic {
  id: string
  name: string
  group?: string
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
  attendance_source?: AttendanceSource
  signature_path?: string
  check_in_at?: string
  submitted_at?: string
  verified_status?: string
  verified_by?: string
}

export interface AdminAttendanceRow extends Attendance {
  member_name: string
  member_group?: string
}

export interface QrValidation {
  event_id: string
  title: string
  date: string
  time?: string
  location?: string
  checkin_expires_at?: string
  is_valid: boolean
  error_message?: string
}
