const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const USER_ID_STORAGE_KEY = 'fieldnote-user-id'

function getUserId() {
  let userId = window.localStorage.getItem(USER_ID_STORAGE_KEY)
  if (!userId) {
    userId = crypto.randomUUID()
    window.localStorage.setItem(USER_ID_STORAGE_KEY, userId)
  }
  return userId
}

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error('Could not connect to the reports service. Check that the backend is running and try again.')
  }

  const responseText = await response.text()
  let result = null
  if (responseText) {
    try {
      result = JSON.parse(responseText)
    } catch {
      throw new Error('The reports service returned an invalid response.')
    }
  }

  if (!response.ok) {
    throw new Error(result?.error || result?.message || `The reports service returned an error (${response.status}).`)
  }

  return result
}

function toApiReport(report) {
  const id = report.id ?? report.uid
  const latitude = Number(report.latitude ?? report.lat)
  const longitude = Number(report.longitude ?? report.lon)
  const severity = Number(report.severity)
  const incidentAt = report.incident_at ?? report.incidentAt ?? report.recorded_at ?? report.reportedAt

  if (id == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || !Number.isInteger(severity) || severity < 0 || severity > 3
    || !incidentAt || !Number.isFinite(Date.parse(incidentAt))) {
    throw new Error('The reports service returned a report with missing or invalid fields.')
  }

  return {
    id: String(id),
    lat: latitude,
    lon: longitude,
    address: report.address ?? 'Location not provided',
    description: report.description ?? '',
    severity,
    confirmedHit: Boolean(report.confirmed_hit ?? report.confirmedHit),
    confirmedAt: report.confirmed_at ?? report.confirmedAt,
    confirmedSeverity: report.confirmed_severity == null && report.confirmedSeverity == null
      ? undefined
      : Number(report.confirmed_severity ?? report.confirmedSeverity),
    incidentAt: new Date(incidentAt).toISOString(),
    reportedAt: report.reported_at ?? report.reportedAt ?? incidentAt,
  }
}

export async function getReports() {
  const result = await request('/reports')
  const reports = Array.isArray(result) ? result : result?.reports
  if (!Array.isArray(reports)) {
    throw new Error('The reports service returned an invalid report list.')
  }
  return reports.map(toApiReport)
}

export async function createReport(report) {
  const result = await request('/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: getUserId(),
      latitude: report.lat,
      longitude: report.lon,
      severity: report.severity,
      incident_at: report.incidentAt,
    }),
  })

  const savedReport = result?.report ?? result
  if (!savedReport || typeof savedReport !== 'object') {
    throw new Error('The reports service did not return the saved report.')
  }
  return toApiReport(savedReport)
}

export async function confirmReport(reportId, confirmedSeverity) {
  const result = await request(`/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      confirmed_hit: true,
      confirmed_at: new Date().toISOString(),
      confirmed_severity: confirmedSeverity,
    }),
  })

  const savedReport = result?.report ?? result
  if (!savedReport || typeof savedReport !== 'object') {
    throw new Error('The reports service did not return the updated report.')
  }
  return toApiReport(savedReport)
}
