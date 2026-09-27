import { Navigate, Route, Routes } from "react-router";
import Banner from "./components/Banner";
import Navbar from "./components/Navbar";
import MapPage from "./pages/MapPage";

export default function App() {
  return (
    <>
      <Banner />

      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/map" element={<MapPage />} />
        {/* Add the /backlog route when BacklogPage exists. */}
      </Routes>

      <Navbar />
    </>
  );
}