import "./Banner.css";

export default function Banner({
  title = "Fill The Hole",
  subtitle = "Spot potholes, verify reports, and help make roads safer.",
}) {
  return (
    <header className="site-banner">
      <div className="site-banner__content">
        <h1 className="site-banner__title">{title}</h1>
        <p className="site-banner__subtitle">{subtitle}</p>
      </div>
    </header>
  );
}
