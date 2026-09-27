import { useEffect, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import CreatePothole from "../components/CreatePothole.jsx";
import "./MapPage.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

const potholeIcon = divIcon({
  className: "pothole-droplet-icon",
  html: '<span class="pothole-droplet"><span class="pothole-droplet__center"></span></span>',
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -42],
});

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

const SEVERITY_LABELS = ["Low", "Medium", "High", "Imminent Destruction"];

function formatIncidentTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
  const [addressByPothole, setAddressByPothole] = useState({});

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

  useEffect(() => {
    const potholesToLocate = potholes.filter(
      (pothole) => pothole.uid && !addressByPothole[pothole.uid]
    );
    if (!potholesToLocate.length) return undefined;

    let isCurrent = true;
    async function loadAddresses() {
      const addresses = {};
      for (const pothole of potholesToLocate) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
              pothole.latitude
            )}&lon=${encodeURIComponent(pothole.longitude)}`,
            { headers: { Accept: "application/json" } }
          );
          if (!response.ok) continue;
          const place = await response.json();
          if (place.display_name) addresses[pothole.uid] = place.display_name;
        } catch {
          // The popup falls back to coordinates when address lookup is unavailable.
        }
      }
      if (isCurrent && Object.keys(addresses).length) {
        setAddressByPothole((current) => ({ ...current, ...addresses }));
      }
    }

    loadAddresses();
    return () => {
      isCurrent = false;
    };
  }, [potholes, addressByPothole]);

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
            icon={potholeIcon}
          >
            <Popup>
              <div className="pothole-popup">
                <strong>Selected pothole location</strong>
                {manualLocation.address && <span>Address: {manualLocation.address}</span>}
                <span>
                  Coordinates: {manualLocation.latitude.toFixed(5)},{" "}
                  {manualLocation.longitude.toFixed(5)}
                </span>
                {Number.isFinite(manualLocation.accuracy) && (
                  <span>Device accuracy: ±{Math.round(manualLocation.accuracy)} m</span>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        {potholes.map((pothole) => {
          const severity = Number(pothole.severity);
          const severityLabel = SEVERITY_LABELS[severity] || "Unknown";
          return (
            <Marker
              key={pothole.uid}
              position={[Number(pothole.latitude), Number(pothole.longitude)]}
              icon={potholeIcon}
            >
              <Popup>
                <div className="pothole-popup">
                  <strong>Pothole report</strong>
                  <span>
                    Address: {addressByPothole[pothole.uid] || "Address lookup unavailable"}
                  </span>
                  <span>
                    Coordinates: {Number(pothole.latitude).toFixed(5)},{" "}
                    {Number(pothole.longitude).toFixed(5)}
                  </span>
                  <span>Date &amp; time: {formatIncidentTime(pothole.recorded_at)}</span>
                  <span>Severity: {severity} - {severityLabel}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </main>
  );
}
