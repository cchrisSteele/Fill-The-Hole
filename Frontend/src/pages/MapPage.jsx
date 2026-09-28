import { useEffect, useRef, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import CreatePothole from "../components/CreatePothole.jsx";
import "./MapPage.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const SEVERITY_LABELS = ["Low", "Medium", "High", "Imminent Destruction"];

function createPotholeIcon(severity) {
  const severityClass = severity >= 0 && severity <= 3
    ? `pothole-marker--severity-${severity}`
    : "pothole-marker--preview";
  const flame = severity === 3
    ? '<span class="pothole-marker__flame" aria-hidden="true"></span>'
    : "";

  return divIcon({
    className: "pothole-marker-icon",
    html: `<span class="pothole-marker ${severityClass}"><span class="pothole-droplet"><span class="pothole-droplet__center"></span></span>${flame}</span>`,
    iconSize: [42, 52],
    iconAnchor: [21, 50],
    popupAnchor: [0, -48],
  });
}

const potholeIcons = SEVERITY_LABELS.map((_, severity) => createPotholeIcon(severity));
const previewIcon = createPotholeIcon(-1);

function FlyToResult({ result }) {
  const map = useMap();
  useEffect(() => {
    if (!result) return;
    const center = [Number(result.lat), Number(result.lon)];
    if (map.getCenter().distanceTo(center) > 10) map.flyTo(center, 15);
  }, [map, result]);
  return null;
}

function MapLocationPicker({ enabled, onSelect, onDirectReport }) {
  useMapEvents({
    click(event) {
      const location = {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      };
      if (enabled) onSelect(location);
      else onDirectReport(location);
    },
  });

  return null;
}

function formatIncidentTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAddress(properties) {
  const street = [properties.housenumber, properties.street].filter(Boolean).join(" ");
  const locality = properties.city
    || properties.town
    || properties.village
    || properties.locality
    || properties.district
    || properties.county;
  const addressParts = [
    street || properties.name,
    locality,
    properties.state,
    properties.postcode,
    properties.country,
  ].filter(Boolean);

  return [...new Set(addressParts)].join(", ");
}

function PotholeMarker({ pothole }) {
  const [address, setAddress] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const lookupStarted = useRef(false);
  const severity = Number(pothole.severity);
  const severityLabel = SEVERITY_LABELS[severity] || "Unknown";
  const latitude = Number(pothole.latitude);
  const longitude = Number(pothole.longitude);

  async function loadAddress() {
    if (lookupStarted.current) return;
    lookupStarted.current = true;
    setIsLoadingAddress(true);
    setAddressError("");

    try {
      const response = await fetch(
        `https://photon.komoot.io/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!response.ok) {
        throw new Error(`Address lookup failed (HTTP ${response.status}).`);
      }

      const result = await response.json();
      const place = result.features?.[0];
      const formattedAddress = place ? formatAddress(place.properties || {}) : "";
      if (!formattedAddress) {
        throw new Error("No address was found for this location.");
      }

      setAddress(formattedAddress);
    } catch (lookupError) {
      setAddressError(lookupError.message || "Address lookup failed.");
    } finally {
      setIsLoadingAddress(false);
    }
  }

  return (
    <Marker
      position={[latitude, longitude]}
      icon={potholeIcons[severity] || previewIcon}
      eventHandlers={{ popupopen: loadAddress }}
    >
      <Popup>
        <div className="pothole-popup">
          <div className="pothole-popup__header">
            <strong>Pothole report</strong>
            <span className="pothole-popup__severity">Severity {severity} · {severityLabel}</span>
          </div>
          <div className="pothole-popup__details">
            <div className="pothole-popup__detail">
              <span className="pothole-popup__label">Address</span>
              <span className="pothole-popup__value">
                {address || (isLoadingAddress ? "Finding address…" : "Address unavailable")}
              </span>
            </div>
            {addressError && (
              <span className="pothole-popup__error" role="status">
                {addressError} Coordinates are shown below.
              </span>
            )}
            <div className="pothole-popup__detail">
              <span className="pothole-popup__label">Coordinates</span>
              <span className="pothole-popup__value pothole-popup__coordinates">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            </div>
            <div className="pothole-popup__detail">
              <span className="pothole-popup__label">Reported</span>
              <span className="pothole-popup__value">
                {formatIncidentTime(pothole.recorded_at)}
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapPage() {
  const [query, setQuery] = useState("");
  const [mapTarget, setMapTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const [potholes, setPotholes] = useState([]);
  const [potholesError, setPotholesError] = useState("");
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState(null);
  const [mapReportRequestId, setMapReportRequestId] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadPotholes() {
      try {
        const response = await fetch(`${API_BASE_URL}/print_potholes`, {
          headers: { Accept: "application/json" },
        });
        let payload;
        try {
          payload = await response.json();
        } catch {
          throw new Error("The reports service returned an invalid response. Please try again.");
        }
        if (!response.ok) {
          throw new Error(payload?.error || "Could not load saved pothole reports.");
        }
        if (!Array.isArray(payload?.potholes)) {
          throw new Error("The reports service returned an invalid pothole list.");
        }
        if (isCurrent) setPotholes(payload.potholes);
      } catch (loadError) {
        if (isCurrent) {
          setPotholesError(loadError.message || "Could not load saved pothole reports.");
        }
      }
    }

    loadPotholes();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query.trim())}`,
        { headers: { Accept: "application/json" } }
      );
      if (!response.ok) throw new Error("Search is unavailable. Try again shortly.");
      const places = await response.json();
      if (!places.length) {
        setError("No matching place found. Try a city, address, or ZIP code.");
      } else {
        const place = places[0];
        const latitude = Number(place.lat);
        const longitude = Number(place.lon);
        if (
          !Number.isFinite(latitude)
          || latitude < -90
          || latitude > 90
          || !Number.isFinite(longitude)
          || longitude < -180
          || longitude > 180
        ) {
          throw new Error("The map search returned an invalid location. Please try another search.");
        }

        setManualLocation({
          latitude,
          longitude,
          address: place.display_name || query.trim(),
        });
        setIsPickingLocation(false);
        setMapTarget({ lat: latitude, lon: longitude });
        setMapReportRequestId((requestId) => requestId + 1);
      }
    } catch (err) {
      setError(err.message || "Could not search right now.");
    } finally {
      setLoading(false);
    }
  }

  function locateDevice() {
    if (!navigator.geolocation) {
      setError("This browser does not support device location.");
      return;
    }

    setIsLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        startReportAtMapLocation({
          latitude,
          longitude,
          accuracy,
          address: "Current device location",
        });
        setIsLocating(false);
      },
      (locationError) => {
        const messageByCode = {
          1: "Location permission was denied. Allow location access in your browser and try again.",
          2: "Your device could not determine its location. Try again or choose a point on the map.",
          3: "Finding your location timed out. Try again or choose a point on the map.",
        };
        setError(
          messageByCode[locationError.code]
          || "Could not get your device location. Try again or choose a point on the map."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  function addPothole(pothole) {
    setPotholes((current) => [pothole, ...current.filter((item) => Number(item.uid) !== pothole.uid)]);
    setPotholesError("");
    setManualLocation(null);
    setIsPickingLocation(false);
    setMapTarget({
      lat: pothole.latitude,
      lon: pothole.longitude,
    });
  }

  function startManualLocationSelection() {
    setManualLocation(null);
    setIsPickingLocation(true);
  }

  function cancelManualLocationSelection() {
    setManualLocation(null);
    setIsPickingLocation(false);
  }

  function selectManualLocation(location) {
    setManualLocation(location);
    setIsPickingLocation(false);
    setMapTarget({ lat: location.latitude, lon: location.longitude });
  }

  function startReportAtMapLocation(location) {
    setManualLocation(location);
    setIsPickingLocation(false);
    setMapTarget({ lat: location.latitude, lon: location.longitude });
    setMapReportRequestId((requestId) => requestId + 1);
  }

  return (
    <main className="map-page">
      <form className="map-search" onSubmit={search} role="search">
        <label htmlFor="map-search-input">Search the map</label>
        <div className="map-search-row">
          <input id="map-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Address, city, or ZIP code" />
          <button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</button>
          <button
            className="map-search__location-button"
            type="button"
            onClick={locateDevice}
            disabled={isLocating}
          >
            {isLocating ? "Finding location…" : "Use my location"}
          </button>
        </div>
        {error && <p className="map-search-error" role="alert">{error}</p>}
      </form>
      {potholesError && <p className="map-search-error" role="alert">{potholesError}</p>}
      <CreatePothole
        key={mapReportRequestId}
        onPotholeCreated={addPothole}
        manualLocation={manualLocation}
        isPickingLocation={isPickingLocation}
        onStartManualLocation={startManualLocationSelection}
        onCancelManualLocation={cancelManualLocationSelection}
        initialStep={mapReportRequestId ? "confirm" : "idle"}
      />
      <MapContainer center={[39.255, -76.71]} zoom={13} className="map-canvas" scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyToResult result={mapTarget} />
        <MapLocationPicker
          enabled={isPickingLocation}
          onSelect={selectManualLocation}
          onDirectReport={startReportAtMapLocation}
        />
        {manualLocation && (
          <Marker
            position={[manualLocation.latitude, manualLocation.longitude]}
            icon={previewIcon}
          >
            <Popup>
              <div className="pothole-popup">
                <div className="pothole-popup__header">
                  <strong>Selected location</strong>
                </div>
                <div className="pothole-popup__details">
                  {manualLocation.address && (
                    <div className="pothole-popup__detail">
                      <span className="pothole-popup__label">Address</span>
                      <span className="pothole-popup__value">{manualLocation.address}</span>
                    </div>
                  )}
                  <div className="pothole-popup__detail">
                    <span className="pothole-popup__label">Coordinates</span>
                    <span className="pothole-popup__value pothole-popup__coordinates">
                      {manualLocation.latitude.toFixed(5)}, {manualLocation.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>
                {Number.isFinite(manualLocation.accuracy) && (
                  <span className="pothole-popup__accuracy">
                    Device accuracy ±{Math.round(manualLocation.accuracy)} m
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        {potholes.map((pothole) => {
          return (
            <PotholeMarker key={pothole.uid} pothole={pothole} />
          );
        })}
      </MapContainer>
    </main>
  );
}
