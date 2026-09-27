import NearbyReports from '../components/NearbyReports.jsx'
import PotholeMap from '../components/PotholeMap.jsx'
import ReportSearch from '../components/ReportSearch.jsx'

function MapPage({
  activeLocation,
  nearbyReports,
  selectedReport,
  onSelectReport,
  onMapClick,
  isPlacingReport,
  onOpenReportForm,
  onTogglePlacingReport,
  onClearSearchError,
  query,
  onQueryChange,
  isSearching,
  onSearch,
  searchResults,
  searchError,
  onSelectLocation,
  onConfirmHit,
}) {
  return (
    <section className="workspace" aria-labelledby="page-title">
      <div className="intro">
        <div>
          <p className="eyebrow">COMMUNITY ROAD REPORTS</p>
          <h1 id="page-title">Find potholes near you</h1>
          <p className="intro-copy">Search an area to see reported potholes, or mark one on the map.</p>
        </div>
        <div className="location-badge"><span /> {nearbyReports.length} NEARBY REPORTS</div>
      </div>

      <ReportSearch
        query={query}
        onQueryChange={onQueryChange}
        isSearching={isSearching}
        onSubmit={onSearch}
        results={searchResults}
        error={searchError}
        onSelectLocation={onSelectLocation}
      />
      <PotholeMap
        activeLocation={activeLocation}
        nearbyReports={nearbyReports}
        selectedReport={selectedReport}
        onSelectReport={onSelectReport}
        onMapClick={onMapClick}
        isPlacingReport={isPlacingReport}
        onOpenReportForm={onOpenReportForm}
        onTogglePlacingReport={onTogglePlacingReport}
        onClearSearchError={onClearSearchError}
      />
      <NearbyReports
        reports={nearbyReports}
        onConfirmHit={onConfirmHit}
        onOpenReportForm={onOpenReportForm}
      />
      <p className="page-footnote">Maps made for the curious <span>✳</span></p>
    </section>
  )
}

export default MapPage
