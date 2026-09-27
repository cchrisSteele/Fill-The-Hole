import { SEVERITY_LEVELS } from '../constants.js'
import { formatCoordinates } from '../utils/reportFormatting.js'

function ReportDialog({
  titleId,
  eyebrow,
  title,
  closeLabel,
  location,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  submitLabel,
  submittingLabel,
  children,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="modal-close" type="button" onClick={onClose} aria-label={closeLabel}>×</button>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <p className="modal-location">{location}</p>
        <form className="report-form" onSubmit={onSubmit}>
          {children}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="submit-report" type="submit" disabled={isSubmitting}>
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </form>
      </section>
    </div>
  )
}

function SeverityOptions() {
  return SEVERITY_LEVELS.map((label, severity) => (
    <option value={severity} key={severity}>{severity} - {label}</option>
  ))
}

function ReportDialogs({
  reportLocation,
  isReportFormOpen,
  onCloseReport,
  onSubmitReport,
  incidentDateTime,
  onIncidentDateTimeChange,
  reportSeverity,
  onReportSeverityChange,
  isSubmittingReport,
  reportSaveError,
  reportToConfirm,
  onCloseConfirmation,
  onSubmitConfirmation,
  confirmationSeverity,
  onConfirmationSeverityChange,
  isSubmittingConfirmation,
  confirmationError,
}) {
  return (
    <>
      {isReportFormOpen && (
        <ReportDialog
          titleId="report-title"
          eyebrow="HELP OTHER DRIVERS"
          title="Report a pothole"
          closeLabel="Close report form"
          location={`${reportLocation?.display_name} · ${reportLocation && formatCoordinates(reportLocation)}`}
          onClose={onCloseReport}
          onSubmit={onSubmitReport}
          isSubmitting={isSubmittingReport}
          error={reportSaveError}
          submitLabel="Submit pothole report"
          submittingLabel="Submitting…"
        >
          <label htmlFor="incident-date-time">Date and time of incident</label>
          <input
            id="incident-date-time"
            type="datetime-local"
            value={incidentDateTime}
            onChange={(event) => onIncidentDateTimeChange(event.target.value)}
            required
          />
          <label htmlFor="report-severity">Severity</label>
          <select
            id="report-severity"
            value={reportSeverity}
            onChange={(event) => onReportSeverityChange(event.target.value)}
          >
            <SeverityOptions />
          </select>
        </ReportDialog>
      )}

      {reportToConfirm && (
        <ReportDialog
          titleId="confirmation-title"
          eyebrow="VERIFY ROAD CONDITION"
          title="Confirm this pothole"
          closeLabel="Close confirmation"
          location="How severe was the incident?"
          onClose={onCloseConfirmation}
          onSubmit={onSubmitConfirmation}
          isSubmitting={isSubmittingConfirmation}
          error={confirmationError}
          submitLabel="Confirm report"
          submittingLabel="Saving…"
        >
          <label htmlFor="confirmation-severity">Severity (0–3)</label>
          <select
            id="confirmation-severity"
            value={confirmationSeverity}
            onChange={(event) => onConfirmationSeverityChange(event.target.value)}
            required
          >
            <option value="" disabled>Select severity</option>
            <SeverityOptions />
          </select>
        </ReportDialog>
      )}
    </>
  )
}

export default ReportDialogs
