import { NavigationIcon } from './Icons.jsx'

const NAVIGATION_ITEMS = [
  { id: 'map', label: 'Map' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'profile', label: 'Profile' },
]

function BottomNavigation({ page, confirmedHitCount }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAVIGATION_ITEMS.map((item) => (
        <a
          className={`nav-link${page === item.id ? ' active' : ''}`}
          href={`#${item.id}`}
          aria-current={page === item.id ? 'page' : undefined}
          key={item.id}
        >
          <NavigationIcon page={item.id} />
          <span>{item.label}</span>
          {item.id === 'backlog' && confirmedHitCount > 0 && (
            <span className="nav-count">{confirmedHitCount}</span>
          )}
        </a>
      ))}
    </nav>
  )
}

export default BottomNavigation
