import { useState } from "react";
import { getUserId } from "../utils/userId.js";
import "./CreatePothole.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const SEVERITY_OPTIONS = [
  { value: 0, label: "Low" },
  { value: 1, label: "Medium" },
  { value: 2, label: "High" },
  { value: 3, label: "Imminent Destruction" },
];

async function savePothole({ latitude, longitude, severity }) {
  const userId = getUserId();
  const payload = {
    user_id: userId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    severity: Number(severity),
  };

  if (
    typeof payload.user_id !== "string"
    || !payload.user_id.trim()
    || !Number.isFinite(payload.latitude)
    || payload.latitude < -90
    || payload.latitude > 90
    || !Number.isFinite(payload.longitude)
    || payload.longitude < -180
    || payload.longitude > 180
    || !Number.isInteger(payload.severity)
    || ![0, 1, 2, 3].includes(payload.severity)
  ) {
    throw new Error("The report needs a valid user ID, map location, and severity.");
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/new_pothole`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not connect to the reports service. Check that the backend is running and try again.");
  }

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    if (!response.ok) {
      throw new Error(
        `The reports service failed with HTTP ${response.status}. Check the Flask server output for the database error.`
      );
    }
    throw new Error("The reports service returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      result?.error
        ? `${result.error} (HTTP ${response.status})`
        : `Could not save the pothole report (HTTP ${response.status}).`
    );
  }
  if (!Number.isInteger(Number(result?.uid)) || Number(result.uid) <= 0) {
    throw new Error("The reports service did not return the saved pothole ID.");
  }

  return {
    user_id: payload.user_id,
    latitude: payload.latitude,
    longitude: payload.longitude,
    severity: payload.severity,
    uid: Number(result.uid),
  };
}

export default function CreatePothole({
  onPotholeCreated,
  manualLocation,
  isPickingLocation,
  onStartManualLocation,
  onCancelManualLocation,
  initialStep = "idle",
}) {
  const [step, setStep] = useState(initialStep);
  const [severity, setSeverity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function closeFlow() {
    if (isSubmitting) return;
    onCancelManualLocation();
    setStep("idle");
    setSeverity("");
    setError("");
  }

  async function submitReport(location) {
    if (!location || severity === "" || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const report = await savePothole({
        latitude: location.latitude,
        longitude: location.longitude,
        severity: Number(severity),
      });

      onPotholeCreated(report);
      onCancelManualLocation();
      setSeverity("");
      setStep("idle");
    } catch (submitError) {
      setError(submitError.message || "Could not submit the pothole report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="create-pothole">
      {isPickingLocation && (
        <div className="create-pothole__map-instruction" role="status">
          <span>Click the map to choose the pothole location.</span>
          <button
            className="create-pothole__instruction-cancel"
            type="button"
            onClick={() => {
              onCancelManualLocation();
              setStep("severity");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {step !== "idle" && (step !== "picking" || manualLocation) && (
        <div
          className="create-pothole__backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeFlow();
          }}
        >
          <section
            className="create-pothole__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-pothole-title"
          >
            <button
              className="create-pothole__close"
              type="button"
              onClick={closeFlow}
              disabled={isSubmitting}
              aria-label="Close pothole report"
            >
              ×
            </button>

            {step === "confirm" ? (
              <>
                <h2 id="create-pothole-title">Did you just hit a pothole?</h2>
                <p className="create-pothole__description">
                  {manualLocation
                    ? `Report a pothole at ${manualLocation.latitude.toFixed(5)}, ${manualLocation.longitude.toFixed(5)}?`
                    : "Confirm to add the road hazard to the map."}
                </p>
                <div className="create-pothole__actions">
                  <button
                    className="create-pothole__button create-pothole__button--secondary"
                    type="button"
                    onClick={closeFlow}
                  >
                    No
                  </button>
                  <button
                    className="create-pothole__button create-pothole__button--primary"
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep("severity");
                    }}
                  >
                    Yes
                  </button>
                </div>
              </>
            ) : step === "severity" ? (
              <div>
                <h2 id="create-pothole-title">How severe was the pothole?</h2>
                <p className="create-pothole__description">
                  {manualLocation
                    ? `Selected map location: ${manualLocation.latitude.toFixed(5)}, ${manualLocation.longitude.toFixed(5)}`
                    : "Choose the pothole's location directly on the map."}
                </p>
                <label className="create-pothole__label" htmlFor="pothole-severity">
                  Severity
                </label>
                <select
                  id="pothole-severity"
                  className="create-pothole__select"
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="" disabled>Select severity</option>
                  {SEVERITY_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.value} - {option.label}
                    </option>
                  ))}
                </select>
                {error && (
                  <p className="create-pothole__error" role="alert">{error}</p>
                )}
                <div className="create-pothole__actions">
                  <button
                    className="create-pothole__button create-pothole__button--secondary"
                    type="button"
                    onClick={closeFlow}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="create-pothole__button create-pothole__button--primary"
                    type="button"
                    onClick={() => {
                      if (manualLocation) {
                        submitReport(manualLocation);
                      } else {
                        setError("");
                        setStep("picking");
                        onStartManualLocation();
                      }
                    }}
                    disabled={isSubmitting || severity === ""}
                  >
                    {isSubmitting ? "Submitting…" : manualLocation ? "Submit report here" : "Choose location on map"}
                  </button>
                </div>
                {manualLocation && (
                  <button
                    className="create-pothole__button create-pothole__button--manual"
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep("picking");
                      onStartManualLocation();
                    }}
                    disabled={isSubmitting || severity === ""}
                  >
                    Pick a different map location
                  </button>
                )}
              </div>
            ) : (
              <div>
                <h2 id="create-pothole-title">Confirm pothole location</h2>
                <p className="create-pothole__description">
                  Selected coordinates: {manualLocation?.latitude.toFixed(5)}, {manualLocation?.longitude.toFixed(5)}
                </p>
                {error && (
                  <p className="create-pothole__error" role="alert">{error}</p>
                )}
                <div className="create-pothole__actions">
                  <button
                    className="create-pothole__button create-pothole__button--secondary"
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep("picking");
                      onStartManualLocation();
                    }}
                    disabled={isSubmitting}
                  >
                    Pick again
                  </button>
                  <button
                    className="create-pothole__button create-pothole__button--primary"
                    type="button"
                    onClick={() => submitReport(manualLocation)}
                    disabled={isSubmitting || !manualLocation}
                  >
                    {isSubmitting ? "Submitting…" : "Submit report"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
