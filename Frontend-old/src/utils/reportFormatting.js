import { SEVERITY_LEVELS } from '../constants.js'

export function getLocalDateTimeValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

export function formatIncidentDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatSeverity(severity) {
  return SEVERITY_LEVELS[Number(severity)] ?? 'Unknown'
}

export function getReportSeverity(report) {
  return report.confirmedSeverity ?? report.severity
}

export function getSeverityClass(severity) {
  return `severity-${Number(severity)}`
}

export function formatCoordinates(location) {
  return `${Number(location.lat).toFixed(4)}, ${Number(location.lon).toFixed(4)}`
}

export function distanceInKilometers(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDifference = radians(Number(second.lat) - Number(first.lat))
  const longitudeDifference = radians(Number(second.lon) - Number(first.lon))
  const latitude = radians(Number(first.lat))
  const secondLatitude = radians(Number(second.lat))
  const distance = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(latitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(distance), Math.sqrt(1 - distance))
}
