import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./MapPage.css";

// Leaflet's default marker images need explicit URLs in many React builds.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToResult({ result }) {
  const map = useMap();
  if (result) {
    const center = [Number(result.lat), Number(result.lon)];
    // Avoid restarting the animation on unrelated renders.
    if (map.getCenter().distanceTo(center) > 10) map.flyTo(center, 15);
  }
  return null;
}

export default function MapPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        setResult(places[0]);
      }
    } catch (err) {
      setError(err.message || "Could not search right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="map-page">
      <form className="map-search" onSubmit={search} role="search">
        <label htmlFor="map-search-input">Search the map</label>
        <div className="map-search-row">
          <input id="map-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Address, city, or ZIP code" />
          <button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</button>
        </div>
        {error && <p className="map-search-error" role="alert">{error}</p>}
      </form>
      <MapContainer center={[39.255, -76.71]} zoom={13} className="map-canvas" scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyToResult result={result} />
        {result && <Marker position={[Number(result.lat), Number(result.lon)]} icon={markerIcon}><Popup>{result.display_name}</Popup></Marker>}
      </MapContainer>
    </main>
  );
}
