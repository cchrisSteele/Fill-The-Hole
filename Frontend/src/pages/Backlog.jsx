import { useEffect, useState } from "react";
import { getUserId } from "../utils/userId.js";
import "./Backlog.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const SEVERITY_LABELS = ["Low", "Medium", "High", "Imminent Destruction"];
const CONFIRMED_REPORTS_STORAGE_PREFIX = "fill-the-hole-confirmed-reports";

function loadUserBacklogState() {
  try {
    const userId = getUserId();
    const savedIds = window.localStorage.getItem(
      `${CONFIRMED_REPORTS_STORAGE_PREFIX}:${userId}`
    );
    const parsedIds = savedIds ? JSON.parse(savedIds) : [];
    if (!Array.isArray(parsedIds) || parsedIds.some((id) => typeof id !== "string")) {
      throw new Error("Saved confirmation data is invalid. Clear this browser's saved report confirmations and try again.");
    }

    return { userId, confirmedIds: new Set(parsedIds), error: "" };
  } catch (loadError) {
    return {
      userId: "",
      confirmedIds: new Set(),
      error: loadError.message || "Could not load this user's saved report confirmations.",
    };
  }
}

function formatIncidentTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function BacklogColumn({ title, reports, emptyMessage, confirmedIds, onConfirm }) {
  return (
    <section className="backlog-column">
      <header className="backlog-column__header">
        <h2>{title}</h2>
        <span className="backlog-column__count">{reports.length}</span>
      </header>
      {reports.length ? (
        <div className="backlog-list">
          {reports.map((report) => {
            const severity = Number(report.severity);
            const severityLabel = SEVERITY_LABELS[severity] || "Unknown";
            const latitude = Number(report.latitude);
            const longitude = Number(report.longitude);

            return (
              <article className="backlog-report" key={report.uid}>
                <div className="backlog-report__title">
                  <strong>Pothole report #{report.uid}</strong>
                  <span className={`backlog-report__status${confirmedIds.has(String(report.uid)) ? " backlog-report__status--confirmed" : ""}`}>
                    {confirmedIds.has(String(report.uid)) ? "Confirmed" : "Awaiting confirmation"}
                  </span>
                </div>
                <span>
                  Severity: {severity} - {severityLabel}
                </span>
                <span>
                  Coordinates: {Number.isFinite(latitude) ? latitude.toFixed(5) : "Unavailable"},{" "}
                  {Number.isFinite(longitude) ? longitude.toFixed(5) : "Unavailable"}
                </span>
                <span>Reported: {formatIncidentTime(report.recorded_at)}</span>
                {!confirmedIds.has(String(report.uid)) && (
                  <button
                    className="backlog-report__confirm"
                    type="button"
                    onClick={() => onConfirm(report.uid)}
                  >
                    Confirm report
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="backlog-column__empty">{emptyMessage}</p>
      )}
    </section>
  );
}

export default function Backlog() {
  const [userBacklogState] = useState(loadUserBacklogState);
  const [reports, setReports] = useState([]);
  const [confirmedIds, setConfirmedIds] = useState(userBacklogState.confirmedIds);
  const [isLoading, setIsLoading] = useState(!userBacklogState.error);
  const [error, setError] = useState(userBacklogState.error);
  const { userId } = userBacklogState;

  useEffect(() => {
    if (!userId) return undefined;
    let isCurrent = true;

    async function loadReports() {
      try {
        const response = await fetch(`${API_BASE_URL}/print_potholes`, {
          headers: { Accept: "application/json" },
        });
        let payload;
        try {
          payload = await response.json();
        } catch {
          throw new Error("The reports service returned an invalid response.");
        }
        if (!response.ok) {
          throw new Error(payload?.error || "Could not load pothole reports.");
        }
        if (!Array.isArray(payload?.potholes)) {
          throw new Error("The reports service returned an invalid report list.");
        }
        if (isCurrent) {
          setReports(
            payload.potholes.filter((report) => report.user_id === userId)
          );
        }
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || "Could not load pothole reports.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadReports();
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  function confirmReport(uid) {
    const reportId = String(uid);
    const updatedIds = new Set(confirmedIds).add(reportId);
    try {
      window.localStorage.setItem(
        `${CONFIRMED_REPORTS_STORAGE_PREFIX}:${userId}`,
        JSON.stringify([...updatedIds])
      );
      setConfirmedIds(updatedIds);
      setError("");
    } catch {
      setError("Could not save this confirmation in your browser. Check that browser storage is available.");
    }
  }

  const pendingReports = reports.filter(
    (report) => Number(report.verified) !== 1 && !confirmedIds.has(String(report.uid))
  );
  const confirmedReports = reports.filter(
    (report) => Number(report.verified) === 1 || confirmedIds.has(String(report.uid))
  );

  return (
    <main className="backlog-page">
      <header className="backlog-page__intro">
        <div>
          <p className="backlog-page__eyebrow">COMMUNITY REPORTS</p>
          <h1>Backlog</h1>
          <p>Review reports that are awaiting confirmation and reports already confirmed.</p>
        </div>
      </header>

      {error && <p className="backlog-page__message backlog-page__message--error" role="alert">{error}</p>}
      {isLoading ? (
        <p className="backlog-page__message" role="status">Loading reports…</p>
      ) : (
        <div className="backlog-columns">
          <BacklogColumn
            title="Awaiting confirmation"
            reports={pendingReports}
            emptyMessage="There are no reports awaiting confirmation."
            confirmedIds={confirmedIds}
            onConfirm={confirmReport}
          />
          <BacklogColumn
            title="Confirmed reports"
            reports={confirmedReports}
            emptyMessage="There are no confirmed reports yet."
            confirmedIds={confirmedIds}
            onConfirm={confirmReport}
          />
        </div>
      )}
    </main>
  );
}