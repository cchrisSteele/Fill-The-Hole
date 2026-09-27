import { PinIcon, SearchIcon } from './Icons.jsx'

function ReportSearch({
  query,
  onQueryChange,
  isSearching,
  onSubmit,
  results,
  error,
  onSelectLocation,
}) {
  return (
    <div className="search-area">
      <form className="search-form" onSubmit={onSubmit} role="search">
        <span className="search-icon"><SearchIcon /></span>
        <label className="visually-hidden" htmlFor="place-search">Search for a city, ZIP code, or address</label>
        <input
          id="place-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
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
                  onClick={() => onSelectLocation(place)}
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
  )
}

export default ReportSearch
