import { Navigate, Route, Routes } from "react-router";
import Banner from "./components/banner.jsx";
import Navbar from "./components/navbar.jsx";
import Backlog from "./pages/Backlog.jsx";
import MapPage from "./pages/MapPage.jsx";

export default function App() {
  return (
    <>
      <Banner />

      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/backlog" element={<Backlog />} />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>

      <Navbar />
    </>
  );
}