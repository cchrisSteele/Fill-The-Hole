import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <a className="bottom-nav__link" href="/map" aria-current="page">
        <span className="bottom-nav__icon" aria-hidden="true">⌖</span>
        <span>Map</span>
      </a>

      {/* Enable this section when the Backlog page and route are ready.
      <a className="bottom-nav__link" href="/backlog">
        <span className="bottom-nav__icon" aria-hidden="true">☷</span>
        <span>Backlog</span>
      </a>
      */}
    </nav>
  );
}
