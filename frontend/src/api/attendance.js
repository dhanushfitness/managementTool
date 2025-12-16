import api from './axios'

// Search member by attendance ID
export const searchMemberByAttendanceId = (attendanceId) => 
  api.get('/attendance/search', { params: { attendanceId } })

// Get active services for a member
export const getMemberActiveServices = (memberId) => 
  api.get(`/attendance/member/${memberId}/services`)

// Check in member
export const checkIn = (data) => 
  api.post('/attendance/checkin', data)

// Check out member
export const checkOut = (attendanceId) => 
  api.post('/attendance/checkout', { attendanceId })

// Get attendance records
export const getAttendance = (params) => 
  api.get('/attendance', { params })

// Get attendance stats
export const getAttendanceStats = (params) => 
  api.get('/attendance/stats', { params })

// Get member attendance history
export const getMemberAttendanceHistory = (memberId, params) => 
  api.get(`/attendance/member/${memberId}`, { params })

// Update attendance (manual override)
export const updateAttendance = (attendanceId, data) => 
  api.put(`/attendance/${attendanceId}`, data)

// Fingerprint check-in (for device integration)
export const fingerprintCheckIn = (data) => 
  api.post('/attendance/fingerprint', data)

// Face recognition check-in (for device integration)
export const faceCheckIn = (data) => 
  api.post('/attendance/face', data)

