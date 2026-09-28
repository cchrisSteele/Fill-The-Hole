import { useEffect } from 'react'
import { divIcon } from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { DEFAULT_CENTER } from '../constants.js'
import { formatCoordinates, formatIncidentDateTime, formatSeverity, getReportSeverity } from '../utils/reportFormatting.js'
import { PinIcon, SearchIcon } from './Icons.jsx'

const confirmedPotholeIcon = divIcon({
  className: 'confirmed-pothole-icon',
  html: '<span class="confirmed-pothole-drop"><span></span></span>',
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -42],
})

function MapController({ location }) {
  const map = useMap()

  useEffect(() => {
    if (!location) return

    const target = [Number(location.lat), Number(location.lon)]
    if (location.boundingbox) {
      const [south, north, west, east] = location.boundingbox.map(Number)
      map.flyToBounds(
        [
          [south, west],
          [north, east],
        ],
        { maxZoom: location.zoom, padding: [48, 48], duration: 1 },
      )
    } else {
      map.flyTo(target, location.zoom, { duration: 1 })
    }
  }, [location, map])

  return null
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng)
    },
  })

  return null
}

function PotholeMap({
  activeLocation,
  nearbyReports,
  selectedReport,
  onSelectReport,
  onMapClick,
  isPlacingReport,
  onOpenReportForm,
  onTogglePlacingReport,
  onClearSearchError,
}) {
  const locationName = activeLocation
    ? activeLocation.name || activeLocation.display_name.split(',')[0]
    : 'Explore anywhere'

  return (
    <section className="map-card" aria-label="Interactive map">
      <div className="map-heading">
        <div>
          <span className="map-heading-icon"><PinIcon /></span>
          <div>
            <p className="map-kicker">LIVE MAP</p>
            <h2>{locationName}</h2>
          </div>
        </div>
        <span className="map-hint">
          <span className="hint-desktop">Scroll to zoom · drag to explore</span>
          <span className="hint-mobile">Pinch to zoom · drag to explore</span>
        </span>
      </div>

      <div className="map-frame">
        <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController location={activeLocation} />
          <MapClickHandler onMapClick={onMapClick} />
          {nearbyReports.map((report) => (
            report.confirmedHit ? (
              <Marker
                key={report.id}
                position={[report.lat, report.lon]}
                icon={confirmedPotholeIcon}
                eventHandlers={{ click: () => onSelectReport(report) }}
              >
                <Popup>
                  <div className="pothole-popup">
                    <strong>{report.description || 'Confirmed pothole hit'}</strong>
                    <span><b>Incident:</b> {formatIncidentDateTime(report.incidentAt)}</span>
                    <span><b>Severity:</b> {formatSeverity(getReportSeverity(report))}</span>
                  </div>
                </Popup>
              </Marker>
            ) : (
              <CircleMarker
                key={report.id}
                center={[report.lat, report.lon]}
                radius={selectedReport?.id === report.id ? 10 : 8}
                pathOptions={{
                  color: '#fff',
                  weight: 3,
                  fillColor: Number(report.severity) >= 2 ? '#c94f3e' : '#e17850',
                  fillOpacity: 1,
                }}
                eventHandlers={{ click: () => onSelectReport(report) }}
              >
                <Popup>
                  <strong>Pothole report</strong>
                  <br />
                  {report.description || report.address}
                  <br />
                  <span>{formatSeverity(getReportSeverity(report))} · {formatCoordinates(report)}</span>
                </Popup>
              </CircleMarker>
            )
          ))}
          {activeLocation && (
            <CircleMarker
              center={[Number(activeLocation.lat), Number(activeLocation.lon)]}
              radius={9}
              pathOptions={{ color: '#fff', weight: 4, fillColor: '#ef765d', fillOpacity: 1 }}
            >
              <Popup>
                <strong>{locationName}</strong>
                <br />
                {formatCoordinates(activeLocation)}
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
        {!activeLocation && (
          <div className="map-empty-state" aria-hidden="true">
            <span><SearchIcon /></span>
            <p>Search an area to find pothole reports.</p>
          </div>
        )}
        <div className="map-scale"><span className="scale-line" /> OPENSTREETMAP</div>
      </div>

      <div className="map-footer">
        {activeLocation ? (
          <>
            <span className="footer-pin"><PinIcon /></span>
            <div className="footer-location">
              <strong>{activeLocation.display_name}</strong>
              <span>{nearbyReports.length} reported pothole{nearbyReports.length === 1 ? '' : 's'} within 5 km</span>
            </div>
            <button className="save-location" type="button" onClick={onOpenReportForm}>
              Report a pothole
            </button>
          </>
        ) : (
          <>
            <span className="footer-pin muted"><SearchIcon /></span>
            <div className="footer-location">
              <strong>{isPlacingReport ? 'Choose a report location' : 'Looking for a road issue?'}</strong>
              <span>
                {isPlacingReport
                  ? 'Click the map where you saw the pothole.'
                  : 'Choose a place or mark a spot on the map to report a pothole.'}
              </span>
            </div>
            <button
              className={`save-location${isPlacingReport ? ' cancel-report' : ''}`}
              type="button"
              onClick={() => {
                onTogglePlacingReport()
                onClearSearchError()
              }}
            >
              {isPlacingReport ? 'Cancel' : 'Report a pothole'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

export default PotholeMap
