import { useState, useCallback, useEffect } from "react";

export type GeolocationStatus =
  | "idle"
  | "pending"
  | "granted"
  | "denied"
  | "unavailable";

export interface Coords {
  lat: number;
  lon: number;
}

export interface UseGeolocationReturn {
  coords: Coords | null;
  status: GeolocationStatus;
  error: string | null;
  request: () => void;
  dismiss: () => void;
}

const SESSION_KEY = "marketplace_geo_status";
const SESSION_COORDS_KEY = "marketplace_geo_coords";
const SESSION_DISMISSED_KEY = "marketplace_geo_dismissed";

export function useGeolocation(): UseGeolocationReturn {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Restore from session on mount (avoid re-asking during the same session)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedStatus = sessionStorage.getItem(
      SESSION_KEY,
    ) as GeolocationStatus | null;
    const savedCoords = sessionStorage.getItem(SESSION_COORDS_KEY);
    const dismissed = sessionStorage.getItem(SESSION_DISMISSED_KEY);

    if (dismissed === "true") {
      setStatus("idle");
      return;
    }

    if (savedStatus === "granted" && savedCoords) {
      try {
        const parsed = JSON.parse(savedCoords) as Coords;
        setCoords(parsed);
        setStatus("granted");
      } catch {
        // ignore parse error
      }
    } else if (savedStatus === "denied") {
      setStatus("denied");
    }
  }, []);

  const request = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("pending");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords: Coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setCoords(newCoords);
        setStatus("granted");
        sessionStorage.setItem(SESSION_KEY, "granted");
        sessionStorage.setItem(SESSION_COORDS_KEY, JSON.stringify(newCoords));
      },
      (err) => {
        const isDenied = err.code === err.PERMISSION_DENIED;
        setStatus(isDenied ? "denied" : "unavailable");
        setError(err.message);
        sessionStorage.setItem(
          SESSION_KEY,
          isDenied ? "denied" : "unavailable",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
    setStatus("idle");
  }, []);

  return { coords, status, error, request, dismiss };
}
