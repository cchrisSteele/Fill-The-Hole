import { useEffect, useState } from 'react'
import { confirmReport, createReport, getReports } from './reportsApi.js'
import BottomNavigation from './components/BottomNavigation.jsx'
import { PinIcon } from './components/Icons.jsx'
import ReportDialogs from './components/ReportDialogs.jsx'
import BacklogPage from './pages/BacklogPage.jsx'
import MapPage from './pages/MapPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { searchLocations } from './services/locationSearch.js'
import { distanceInKilometers, getLocalDateTimeValue } from './utils/reportFormatting.js'
import 'leaflet/dist/leaflet.css'
import './App.css'

function App() {
  const [page, setPage] = useState(() => window.location.hash.slice(1) || 'map')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [activeLocation, setActiveLocation] = useState(null)
  const [reports, setReports] = useState([])
  const [reportLocation, setReportLocation] = useState(null)
  const [reportSeverity, setReportSeverity] = useState('1')
  const [reportToConfirm, setReportToConfirm] = useState(null)
  const [confirmationSeverity, setConfirmationSeverity] = useState('')
  const [incidentDateTime, setIncidentDateTime] = useState(() => getLocalDateTimeValue())
  const [isReportFormOpen, setIsReportFormOpen] = useState(false)
  const [isPlacingReport, setIsPlacingReport] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [isSubmittingConfirmation, setIsSubmittingConfirmation] = useState(false)
  const [reportSaveError, setReportSaveError] = useState('')
  const [confirmationError, setConfirmationError] = useState('')
  const [reportsError, setReportsError] = useState('')
  const [reportsReloadKey, setReportsReloadKey] = useState(0)
  const [searchError, setSearchError] = useState('')

  const nearbyReports = reports.filter((report) => (
    !activeLocation || distanceInKilometers(activeLocation, report) <= 5
  ))
  const confirmedHitCount = reports.filter((report) => report.confirmedHit).length
  const pendingReports = reports.filter((report) => !report.confirmedHit)
  const confirmedReports = reports.filter((report) => report.confirmedHit)

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

  useEffect(() => {
    let isCurrent = true

    async function loadReports() {
      setIsLoadingReports(true)
      setReportsError('')
      try {
        const savedReports = await getReports()
        if (isCurrent) setReports(savedReports)
      } catch (loadError) {
        if (isCurrent) setReportsError(loadError.message || 'Could not load saved reports.')
      } finally {
        if (isCurrent) setIsLoadingReports(false)
      }
    }

    loadReports()
    return () => { isCurrent = false }
  }, [reportsReloadKey])

  async function handleSearch(event) {
    event.preventDefault()
    const searchTerm = query.trim()
    if (!searchTerm || isSearching) return

    setIsSearching(true)
    setSearchError('')
    setSearchResults([])

    try {
      const places = await searchLocations(searchTerm)
      if (places.length === 0) {
        setSearchError('No places found. Try a city, ZIP code, or a more specific address.')
        return
      }
      setSearchResults(places)
    } catch (error) {
      setSearchError(error.message || 'Something went wrong while searching. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  function selectLocation(location) {
    setActiveLocation(location)
    setSearchResults([])
    setSearchError('')
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
      setSearchError('Search for a place or click the map to choose where to report the pothole.')
      return
    }
    setReportLocation(activeLocation)
    setIncidentDateTime(getLocalDateTimeValue())
    setIsReportFormOpen(true)
  }

  async function submitReport(event) {
    event.preventDefault()
    if (!reportLocation || isSubmittingReport) return

    const report = {
      lat: Number(reportLocation.lat),
      lon: Number(reportLocation.lon),
      severity: Number(reportSeverity),
      incidentAt: new Date(incidentDateTime).toISOString(),
    }

    setIsSubmittingReport(true)
    setReportSaveError('')
    try {
      const savedReport = await createReport(report)
      setReports((currentReports) => [
        savedReport,
        ...currentReports.filter((item) => item.id !== savedReport.id),
      ])
      setSelectedReport(savedReport)
      setReportSeverity('1')
      setIncidentDateTime(getLocalDateTimeValue())
      setIsReportFormOpen(false)
    } catch (error) {
      setReportSaveError(error.message || 'Could not submit this report. Please try again.')
    } finally {
      setIsSubmittingReport(false)
    }
  }

  function confirmHit(reportId) {
    const report = reports.find((item) => item.id === reportId)
    if (!report || report.confirmedHit) return

    setReportToConfirm(reportId)
    setConfirmationSeverity('')
  }

  async function submitConfirmation(event) {
    event.preventDefault()
    const report = reports.find((item) => item.id === reportToConfirm)
    if (!report || confirmationSeverity === '' || isSubmittingConfirmation) return

    const confirmedSeverity = Number(confirmationSeverity)
    setIsSubmittingConfirmation(true)
    setConfirmationError('')
    try {
      const confirmedReport = await confirmReport(report.id, confirmedSeverity)
      setReports((currentReports) => currentReports.map((item) => (
        item.id === report.id ? confirmedReport : item
      )))
      setSelectedReport(confirmedReport)
      setActiveLocation({
        lat: confirmedReport.lat,
        lon: confirmedReport.lon,
        display_name: confirmedReport.address,
        type: 'pin',
        zoom: 16,
      })
      setReportToConfirm(null)
      setConfirmationSeverity('')
    } catch (error) {
      setConfirmationError(error.message || 'Could not save this confirmation. Please try again.')
    } finally {
      setIsSubmittingConfirmation(false)
    }
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

      {(isLoadingReports || reportsError) && (
        <div
          className={`reports-status${reportsError ? ' reports-status-error' : ''}`}
          role={reportsError ? 'alert' : 'status'}
        >
          {reportsError ? (
            <>
              <span>{reportsError}</span>
              <button type="button" onClick={() => setReportsReloadKey((key) => key + 1)}>Retry</button>
            </>
          ) : 'Loading saved reports…'}
        </div>
      )}

      {page === 'map' && (
        <MapPage
          activeLocation={activeLocation}
          nearbyReports={nearbyReports}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReport}
          onMapClick={handleMapClick}
          isPlacingReport={isPlacingReport}
          onOpenReportForm={openReportForm}
          onTogglePlacingReport={() => setIsPlacingReport((placing) => !placing)}
          onClearSearchError={() => setSearchError('')}
          query={query}
          onQueryChange={setQuery}
          isSearching={isSearching}
          onSearch={handleSearch}
          searchResults={searchResults}
          searchError={searchError}
          onSelectLocation={selectLocation}
          onConfirmHit={confirmHit}
        />
      )}

      {page === 'backlog' && (
        <BacklogPage
          reports={reports}
          pendingReports={pendingReports}
          confirmedReports={confirmedReports}
          confirmedHitCount={confirmedHitCount}
          onConfirmHit={confirmHit}
        />
      )}

      {page === 'profile' && <ProfilePage confirmedHitCount={confirmedHitCount} />}

      <BottomNavigation page={page} confirmedHitCount={confirmedHitCount} />

      <ReportDialogs
        reportLocation={reportLocation}
        isReportFormOpen={isReportFormOpen}
        onCloseReport={() => setIsReportFormOpen(false)}
        onSubmitReport={submitReport}
        incidentDateTime={incidentDateTime}
        onIncidentDateTimeChange={setIncidentDateTime}
        reportSeverity={reportSeverity}
        onReportSeverityChange={setReportSeverity}
        isSubmittingReport={isSubmittingReport}
        reportSaveError={reportSaveError}
        reportToConfirm={reportToConfirm}
        onCloseConfirmation={() => setReportToConfirm(null)}
        onSubmitConfirmation={submitConfirmation}
        confirmationSeverity={confirmationSeverity}
        onConfirmationSeverityChange={setConfirmationSeverity}
        isSubmittingConfirmation={isSubmittingConfirmation}
        confirmationError={confirmationError}
      />
    </main>
  )
}

export default App
