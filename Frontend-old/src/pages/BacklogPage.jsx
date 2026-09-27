import { formatIncidentDateTime, formatSeverity, getReportSeverity, getSeverityClass } from '../utils/reportFormatting.js'

function BacklogColumn({ id, title, reports, children }) {
  return (
    <section className="backlog-column" aria-labelledby={id}>
      <div className="backlog-column-heading">
        <h2 id={id}>{title}</h2>
        <span>{reports.length}</span>
      </div>
      {children}
    </section>
  )
}

function BacklogPage({ reports, pendingReports, confirmedReports, confirmedHitCount, onConfirmHit }) {
  return (
    <section className="workspace secondary-page" aria-labelledby="page-title">
      <div className="intro">
        <div>
          <p className="eyebrow">COMMUNITY CONFIRMATIONS</p>
          <h1 id="page-title">Backlog</h1>
          <p className="intro-copy">Confirm which reported potholes you actually hit.</p>
        </div>
        <span className="page-count">
          {confirmedHitCount} {confirmedHitCount === 1 ? 'CONFIRMED HIT' : 'CONFIRMED HITS'}
        </span>
      </div>
      <div className="backlog-columns">
        <BacklogColumn id="pending-reports-title" title="Awaiting confirmation" reports={pendingReports}>
          {pendingReports.length > 0 ? (
            <div className="backlog-list">
              {pendingReports.map((report) => (
                <article className="backlog-item" key={report.id}>
                  <span
                    className={`report-severity ${getSeverityClass(report.severity)}`}
                    aria-label={`${formatSeverity(report.severity)} severity`}
                  />
                  <div className="backlog-copy">
                    <strong>{report.description || 'Pothole reported'}</strong>
                    <span>{report.address}</span>
                    <small>{formatSeverity(report.severity)} severity · incident {formatIncidentDateTime(report.incidentAt)}</small>
                  </div>
                  <button className="backlog-view" type="button" onClick={() => onConfirmHit(report.id)}>
                    Confirm hit
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="backlog-column-empty">
              {reports.length === 0
                ? <>No reports yet. Find a pothole on the map to get started. <a href="#map">Find potholes</a></>
                : 'All reports have been confirmed.'}
            </p>
          )}
        </BacklogColumn>

        <BacklogColumn id="confirmed-reports-title" title="Confirmed reports" reports={confirmedReports}>
          {confirmedReports.length > 0 ? (
            <div className="backlog-list">
              {confirmedReports.map((report) => (
                <article className="backlog-item" key={report.id}>
                  <span
                    className={`report-severity ${getSeverityClass(getReportSeverity(report))}`}
                    aria-label={`${formatSeverity(getReportSeverity(report))} severity`}
                  />
                  <div className="backlog-copy">
                    <strong>{report.description || 'Pothole reported'}</strong>
                    <span>{report.address}</span>
                    <small>
                      {formatSeverity(getReportSeverity(report))} severity · incident {formatIncidentDateTime(report.incidentAt)}
                    </small>
                  </div>
                  <span className="confirmed-badge">Confirmed</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="backlog-column-empty">Reports you confirm will appear here.</p>
          )}
        </BacklogColumn>
      </div>
    </section>
  )
}

export default BacklogPage
