import { useEffect, useState } from 'react'
import { divIcon } from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

const DEFAULT_CENTER = [39.2556, -76.7113]
const confirmedPotholeIcon = divIcon({
  className: 'confirmed-pothole-icon',
  html: '<span class="confirmed-pothole-drop"><span></span></span>',
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -42],
})

function getLocalDateTimeValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function formatIncidentDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatSeverity(severity) {
  if (severity === 'completely-fucked') return 'Completely fucked'
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function NavigationIcon({ page }) {
  if (page === 'map') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
        <path d="M9 3v15m6-12v15" />
      </svg>
    )
  }

  if (page === 'backlog') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

function formatCoordinates(location) {
  return `${Number(location.lat).toFixed(4)}, ${Number(location.lon).toFixed(4)}`
}

function distanceInKilometers(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDifference = radians(Number(second.lat) - Number(first.lat))
  const longitudeDifference = radians(Number(second.lon) - Number(first.lon))
  const latitude = radians(Number(first.lat))
  const secondLatitude = radians(Number(second.lat))
  const distance = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(latitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(distance), Math.sqrt(1 - distance))
}

function App() {
  const [page, setPage] = useState(() => window.location.hash.slice(1) || 'map')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [activeLocation, setActiveLocation] = useState(null)
  const [reports, setReports] = useState([])
  const [reportLocation, setReportLocation] = useState(null)
  const [reportDescription, setReportDescription] = useState('')
  const [reportSeverity, setReportSeverity] = useState('mid')
  const [incidentDateTime, setIncidentDateTime] = useState(() => getLocalDateTimeValue())
  const [isReportFormOpen, setIsReportFormOpen] = useState(false)
  const [isPlacingReport, setIsPlacingReport] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const nearbyReports = reports.filter((report) => (
    !activeLocation || distanceInKilometers(activeLocation, report) <= 5
  ))
  const confirmedHitCount = reports.filter((report) => report.confirmedHit).length

  useEffect(() => {
    function updatePage() {
      const nextPage = window.location.hash.slice(1)
      setPage(['map', 'backlog', 'profile'].includes(nextPage) ? nextPage : 'map')
    }

    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  useEffect(() => {
    if (window.location.hash.slice(1) !== page) {
      window.location.hash = page
    }
  }, [page])

  async function handleSearch(event) {
    event.preventDefault()
    const searchTerm = query.trim()

    if (!searchTerm || isSearching) return

    setIsSearching(true)
    setError('')
    setResults([])

    try {
      const params = new URLSearchParams({
        q: searchTerm,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
      })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)

      if (!response.ok) {
        throw new Error('The location search is temporarily unavailable. Please try again.')
      }

      const places = await response.json()
      if (places.length === 0) {
        setError('No places found. Try a city, ZIP code, or a more specific address.')
        return
      }

      setResults(places.map((place) => ({
        ...place,
        zoom: place.type === 'postcode' ? 13 : place.type === 'city' ? 12 : 15,
      })))
    } catch (searchError) {
      setError(searchError.message || 'Something went wrong while searching. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  function selectLocation(location) {
    setActiveLocation(location)
    setResults([])
    setError('')
  }

  function handleMapClick(latlng) {
    const location = {
      lat: latlng.lat,
      lon: latlng.lng,
      display_name: 'Map pin',
      type: 'pin',
      zoom: 15,
    }
    setActiveLocation(location)
    setSelectedReport(null)
    if (isPlacingReport) {
      setReportLocation(location)
      setIncidentDateTime(getLocalDateTimeValue())
      setIsReportFormOpen(true)
      setIsPlacingReport(false)
    }
  }

  function openReportForm() {
    if (!activeLocation) {
      setError('Search for a place or click the map to choose where to report the pothole.')
      return
    }
    setReportLocation(activeLocation)
    setIncidentDateTime(getLocalDateTimeValue())
    setIsReportFormOpen(true)
  }

  function submitReport(event) {
    event.preventDefault()
    if (!reportLocation) return

    const report = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      lat: Number(reportLocation.lat),
      lon: Number(reportLocation.lon),
      address: reportLocation.display_name,
      description: reportDescription.trim(),
      severity: reportSeverity,
      confirmedHit: false,
      incidentAt: new Date(incidentDateTime).toISOString(),
      reportedAt: new Date().toISOString(),
    }
    setReports((currentReports) => [report, ...currentReports])
    setSelectedReport(report)
    setReportDescription('')
    setReportSeverity('mid')
    setIncidentDateTime(getLocalDateTimeValue())
    setIsReportFormOpen(false)
  }

  function confirmHit(reportId) {
    const confirmedAt = new Date().toISOString()
    const report = reports.find((item) => item.id === reportId)
    if (!report) return

    setReports((currentReports) => currentReports.map((report) => (
      report.id === reportId ? { ...report, confirmedHit: true, confirmedAt } : report
    )))
    const confirmedReport = { ...report, confirmedHit: true, confirmedAt }
    setSelectedReport(confirmedReport)
    setActiveLocation({
      lat: report.lat,
      lon: report.lon,
      display_name: report.address,
      type: 'pin',
      zoom: 16,
    })
    setPage('map')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Fieldnote home">
          <span className="brand-mark"><PinIcon /></span>
          <span>fieldnote</span>
        </a>
        <span className="topbar-note">Find your place on the map</span>
      </header>

      {page === 'map' && (
        <section className="workspace" aria-labelledby="page-title">
          <div className="intro">
            <div>
              <p className="eyebrow">COMMUNITY ROAD REPORTS</p>
              <h1 id="page-title">Find potholes near you</h1>
              <p className="intro-copy">Search an area to see reported potholes, or mark one on the map.</p>
            </div>
            <div className="location-badge"><span /> {nearbyReports.length} NEARBY REPORTS</div>
          </div>

          <div className="search-area">
            <form className="search-form" onSubmit={handleSearch} role="search">
            <span className="search-icon"><SearchIcon /></span>
            <label className="visually-hidden" htmlFor="place-search">Search for a city, ZIP code, or address</label>
            <input
              id="place-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a city, ZIP code, or address"
              autoComplete="off"
            />
            <button className="search-button" type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? <span className="button-spinner" /> : <SearchIcon />}
              <span>{isSearching ? 'Searching' : 'Search'}</span>
            </button>
            </form>

            {(results.length > 0 || error) && (
              <div className="search-popover" role="status">
              {results.length > 0 ? (
                <>
                  <p className="popover-label">SEARCH RESULTS <span>{results.length}</span></p>
                  {results.map((place) => (
                    <button
                      className="result-item"
                      type="button"
                      key={place.place_id}
                      onClick={() => selectLocation(place)}
                    >
                      <span className="result-pin"><PinIcon /></span>
                      <span className="result-copy">
                        <strong>{place.name || place.display_name.split(',')[0]}</strong>
                        <span>{place.display_name}</span>
                      </span>
                      <span className="result-arrow" aria-hidden="true">↗</span>
                    </button>
                  ))}
                </>
              ) : (
                <p className="search-error">{error}</p>
              )}
              </div>
            )}
          </div>

          <section className="map-card" aria-label="Interactive map">
          <div className="map-heading">
            <div>
              <span className="map-heading-icon"><PinIcon /></span>
              <div>
                <p className="map-kicker">LIVE MAP</p>
                <h2>{activeLocation ? activeLocation.name || activeLocation.display_name.split(',')[0] : 'Explore anywhere'}</h2>
              </div>
            </div>
            <span className="map-hint"><span className="hint-desktop">Scroll to zoom · drag to explore</span><span className="hint-mobile">Pinch to zoom · drag to explore</span></span>
          </div>

          <div className="map-frame">
            <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom className="leaflet-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController location={activeLocation} />
              <MapClickHandler onMapClick={handleMapClick} />
              {nearbyReports.map((report) => (
                report.confirmedHit ? (
                  <Marker
                    key={report.id}
                    position={[report.lat, report.lon]}
                    icon={confirmedPotholeIcon}
                    eventHandlers={{ click: () => setSelectedReport(report) }}
                  >
                    <Popup>
                      <div className="pothole-popup">
                        <strong>{report.description || 'Confirmed pothole hit'}</strong>
                        <span><b>Incident:</b> {formatIncidentDateTime(report.incidentAt)}</span>
                        <span><b>Severity:</b> {formatSeverity(report.severity)}</span>
                      </div>
                    </Popup>
                  </Marker>
                ) : (
                  <CircleMarker
                    key={report.id}
                    center={[report.lat, report.lon]}
                    radius={selectedReport?.id === report.id ? 10 : 8}
                    pathOptions={{ color: '#fff', weight: 3, fillColor: report.severity === 'high' || report.severity === 'completely-fucked' ? '#c94f3e' : '#e17850', fillOpacity: 1 }}
                    eventHandlers={{ click: () => setSelectedReport(report) }}
                  >
                    <Popup>
                      <strong>Pothole report</strong>
                      <br />
                      {report.description || report.address}
                      <br />
                      <span>{formatSeverity(report.severity)} · {formatCoordinates(report)}</span>
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
                    <strong>{activeLocation.name || activeLocation.display_name.split(',')[0]}</strong>
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
                <button
                  className="save-location"
                  type="button"
                  onClick={openReportForm}
                >
                  Report a pothole
                </button>
              </>
            ) : (
              <>
                <span className="footer-pin muted"><SearchIcon /></span>
                <div className="footer-location">
                  <strong>{isPlacingReport ? 'Choose a report location' : 'Looking for a road issue?'}</strong>
                  <span>{isPlacingReport ? 'Click the map where you saw the pothole.' : 'Choose a place or mark a spot on the map to report a pothole.'}</span>
                </div>
                <button
                  className={`save-location${isPlacingReport ? ' cancel-report' : ''}`}
                  type="button"
                  onClick={() => {
                    setIsPlacingReport((placing) => !placing)
                    setError('')
                  }}
                >
                  {isPlacingReport ? 'Cancel' : 'Report a pothole'}
                </button>
              </>
            )}
          </div>
        </section>
          <section className="nearby-section" aria-labelledby="nearby-title">
            <div className="nearby-heading">
              <div>
                <p className="eyebrow">ROAD CONDITIONS</p>
                <h2 id="nearby-title">Reported potholes <span>{nearbyReports.length}</span></h2>
              </div>
              {nearbyReports.length > 0 && <p className="confirm-instruction">Confirm if you hit one to help verify the report.</p>}
            </div>
            {nearbyReports.length ? (
              <div className="report-list">
                {nearbyReports.map((report) => (
                  <article className="report-item" key={report.id}>
                    <span className={`report-severity ${report.severity}`} aria-label={`${report.severity} severity`} />
                    <div className="report-copy">
                      <strong>{report.description || 'Pothole reported'}</strong>
                      <span>{report.address} · {formatCoordinates(report)}</span>
                      <small>{formatSeverity(report.severity)} severity · incident {formatIncidentDateTime(report.incidentAt)}</small>
                    </div>
                    <button
                      className="confirm-hit"
                      type="button"
                      onClick={() => confirmHit(report.id)}
                      disabled={report.confirmedHit}
                    >
                      {report.confirmedHit ? 'Hit confirmed' : 'I hit this pothole'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="reports-empty">
                <span className="empty-page-icon"><PinIcon /></span>
                <div>
                  <strong>No potholes reported here yet</strong>
                  <p>Know of one? Add a report so other drivers can watch out.</p>
                </div>
                <button className="text-action" type="button" onClick={openReportForm}>Report one</button>
              </div>
            )}
          </section>
          <p className="page-footnote">Maps made for the curious <span>✳</span></p>
      </section>
      )}

      {page === 'backlog' && (
        <section className="workspace secondary-page" aria-labelledby="page-title">
          <div className="intro">
            <div>
              <p className="eyebrow">COMMUNITY CONFIRMATIONS</p>
              <h1 id="page-title">Backlog</h1>
              <p className="intro-copy">Confirm which reported potholes you actually hit.</p>
            </div>
            <span className="page-count">{confirmedHitCount} {confirmedHitCount === 1 ? 'CONFIRMED HIT' : 'CONFIRMED HITS'}</span>
          </div>
          {reports.length > 0 ? (
            <div className="backlog-list">
              {reports.map((report) => (
                <article className="backlog-item" key={report.id}>
                  <span className="backlog-pin pothole-list-icon"><PinIcon /></span>
                  <div className="backlog-copy">
                    <strong>{report.description || 'Pothole reported'}</strong>
                    <span>{report.address}</span>
                    <small>{formatSeverity(report.severity)} severity · incident {formatIncidentDateTime(report.incidentAt)}</small>
                  </div>
                  {report.confirmedHit ? (
                    <span className="confirmed-badge">You confirmed this hit</span>
                  ) : (
                    <button className="backlog-view" type="button" onClick={() => confirmHit(report.id)}>I hit this pothole</button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-page">
              <span className="empty-page-icon"><NavigationIcon page="backlog" /></span>
              <h2>No pothole reports to confirm yet</h2>
              <p>Search the map for reported potholes. When you’ve hit one, confirm it here to strengthen the community report.</p>
              <a className="page-action" href="#map">Find potholes</a>
            </div>
          )}
        </section>
      )}

      {page === 'profile' && (
        <section className="workspace secondary-page" aria-labelledby="page-title">
          <div className="intro">
            <div>
              <p className="eyebrow">YOUR SPACE</p>
              <h1 id="page-title">Profile</h1>
              <p className="intro-copy">Your reports help drivers spot road hazards. Confirmations help the community know what’s been hit.</p>
            </div>
          </div>
          <section className="profile-card" aria-label="Guest profile">
            <div className="profile-avatar"><NavigationIcon page="profile" /></div>
            <div className="profile-details">
              <p className="map-kicker">EXPLORER</p>
              <h2>Guest explorer</h2>
              <p>Report potholes you spot and confirm ones you hit.</p>
            </div>
          </section>
          <section className="profile-stat">
            <span className="backlog-pin"><NavigationIcon page="backlog" /></span>
            <div><strong>{confirmedHitCount}</strong><span>Potholes you confirmed hitting</span></div>
            <a href="#backlog">View backlog <span aria-hidden="true">→</span></a>
          </section>
        </section>
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        {[
          { id: 'map', label: 'Map' },
          { id: 'backlog', label: 'Backlog' },
          { id: 'profile', label: 'Profile' },
        ].map((item) => (
          <a
            className={`nav-link${page === item.id ? ' active' : ''}`}
            href={`#${item.id}`}
            aria-current={page === item.id ? 'page' : undefined}
            key={item.id}
          >
            <NavigationIcon page={item.id} />
            <span>{item.label}</span>
            {item.id === 'backlog' && confirmedHitCount > 0 && <span className="nav-count">{confirmedHitCount}</span>}
          </a>
        ))}
      </nav>

      {isReportFormOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsReportFormOpen(false)
        }}>
          <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <button className="modal-close" type="button" onClick={() => setIsReportFormOpen(false)} aria-label="Close report form">×</button>
            <p className="eyebrow">HELP OTHER DRIVERS</p>
            <h2 id="report-title">Report a pothole</h2>
            <p className="modal-location">{reportLocation?.display_name} · {reportLocation && formatCoordinates(reportLocation)}</p>
            <form className="report-form" onSubmit={submitReport}>
              <label htmlFor="report-description">What should drivers know?</label>
              <textarea
                id="report-description"
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value)}
                placeholder="For example: deep pothole in the right lane"
                rows="3"
              />
              <label htmlFor="incident-date-time">Date and time of incident</label>
              <input
                id="incident-date-time"
                type="datetime-local"
                value={incidentDateTime}
                onChange={(event) => setIncidentDateTime(event.target.value)}
                required
              />
              <label htmlFor="report-severity">Severity</label>
              <select id="report-severity" value={reportSeverity} onChange={(event) => setReportSeverity(event.target.value)}>
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
                <option value="completely-fucked">Completely fucked</option>
              </select>
              <button className="submit-report" type="submit">Submit pothole report</button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
