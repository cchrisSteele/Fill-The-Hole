import { formatCoordinates, formatIncidentDateTime, formatSeverity, getReportSeverity, getSeverityClass } from '../utils/reportFormatting.js'
import { PinIcon } from './Icons.jsx'

function NearbyReports({ reports, onConfirmHit, onOpenReportForm }) {
  return (
    <section className="nearby-section" aria-labelledby="nearby-title">
      <div className="nearby-heading">
        <div>
          <p className="eyebrow">ROAD CONDITIONS</p>
          <h2 id="nearby-title">Reported potholes <span>{reports.length}</span></h2>
        </div>
        {reports.length > 0 && (
          <p className="confirm-instruction">Confirm if you hit one to help verify the report.</p>
        )}
      </div>
      {reports.length ? (
        <div className="report-list">
          {reports.map((report) => (
            <article className="report-item" key={report.id}>
              <span
                className={`report-severity ${getSeverityClass(getReportSeverity(report))}`}
                aria-label={`${formatSeverity(getReportSeverity(report))} severity`}
              />
              <div className="report-copy">
                <strong>{report.description || 'Pothole reported'}</strong>
                <span>{report.address} · {formatCoordinates(report)}</span>
                <small>
                  {formatSeverity(getReportSeverity(report))} severity · incident {formatIncidentDateTime(report.incidentAt)}
                </small>
              </div>
              <button
                className="confirm-hit"
                type="button"
                onClick={() => onConfirmHit(report.id)}
                disabled={report.confirmedHit}
              >
                {report.confirmedHit ? 'Hit confirmed' : 'I hit this pothole'}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="reports-empty">
          <span className="empty-page-icon"><PinIcon /></span>
          <div>
            <strong>No potholes reported here yet</strong>
            <p>Know of one? Add a report so other drivers can watch out.</p>
          </div>
          <button className="text-action" type="button" onClick={onOpenReportForm}>Report one</button>
        </div>
      )}
    </section>
  )
}

export default NearbyReports
