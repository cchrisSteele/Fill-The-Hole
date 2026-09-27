import { NavigationIcon } from '../components/Icons.jsx'

function ProfilePage({ confirmedHitCount }) {
  return (
    <section className="workspace secondary-page" aria-labelledby="page-title">
      <div className="intro">
        <div>
          <p className="eyebrow">YOUR SPACE</p>
          <h1 id="page-title">Profile</h1>
          <p className="intro-copy">
            Your reports help drivers spot road hazards. Confirmations help the community know what’s been hit.
          </p>
        </div>
      </div>
      <section className="profile-card" aria-label="Guest profile">
        <div className="profile-avatar"><NavigationIcon page="profile" /></div>
        <div className="profile-details">
          <p className="map-kicker">EXPLORER</p>
          <h2>Guest explorer</h2>
          <p>Report potholes you spot and confirm ones you hit.</p>
        </div>
      </section>
      <section className="profile-stat">
        <span className="backlog-pin"><NavigationIcon page="backlog" /></span>
        <div><strong>{confirmedHitCount}</strong><span>Potholes you confirmed hitting</span></div>
        <a href="#backlog">View backlog <span aria-hidden="true">→</span></a>
      </section>
    </section>
  )
}

export default ProfilePage
