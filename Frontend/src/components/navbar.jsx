import { NavLink } from "react-router";
import "./navbar.css";

export default function Navbar() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <NavLink
        className={({ isActive }) => `bottom-nav__link${isActive ? " bottom-nav__link--active" : ""}`}
        to="/map"
      >
        <span className="bottom-nav__icon" aria-hidden="true">⌖</span>
        <span>Map</span>
      </NavLink>
      <NavLink
        className={({ isActive }) => `bottom-nav__link${isActive ? " bottom-nav__link--active" : ""}`}
        to="/backlog"
      >
        <span className="bottom-nav__icon" aria-hidden="true">☷</span>
        <span>Backlog</span>
      </NavLink>
    </nav>
  );
}
