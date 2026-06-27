export type AttendanceStatus = 'hadir' | 'izin' | 'alfa'

export interface Member {
  id: string
  name: string
  group?: string
  phone?: string
}

export interface Event {
  id: string
  title: string
  date: string
  location?: string
  checkin_close_at?: string
}

export interface Attendance {
  id: string
  event_id: string
  member_id: string
  status: AttendanceStatus
  note?: string
}
