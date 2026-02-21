import { useEffect, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import { createCircleGeoJSON } from "../utils/geoUtils";

const SOURCE_ID = "user-radius-source";
const FILL_LAYER_ID = "user-radius-fill";
const OUTLINE_LAYER_ID = "user-radius-outline";

interface UseMapRadiusLayerOptions {
  /**
   * Pass the entire MutableRefObject<mapboxgl.Map | null> so the hook can
   * always read the latest map instance — avoids stale ref issues.
   */
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  centerLon: number | null;
  centerLat: number | null;
  radiusKm: number;
  visible: boolean;
}

/**
 * Hook that manages a Mapbox GeoJSON radius circle layer.
 * Draws a filled + outlined circle around the user location.
 * Updates reactively when radiusKm, center, or visible changes.
 */
export function useMapRadiusLayer({
  mapRef,
  mapLoaded,
  centerLon,
  centerLat,
  radiusKm,
  visible,
}: UseMapRadiusLayerOptions) {
  const layersAddedRef = useRef(false);

  // Add GeoJSON source + layers once when map finishes loading
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || layersAddedRef.current) return;

    const emptyGeoJSON: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: {},
    };

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: emptyGeoJSON,
    });

    // Semi-transparent blue fill
    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      paint: {
        "fill-color": "#2563eb",
        "fill-opacity": 0.07,
      },
    });

    // Dashed blue outline
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": "#2563eb",
        "line-width": 1.5,
        "line-dasharray": [4, 3],
        "line-opacity": 0.55,
      },
    });

    layersAddedRef.current = true;
  }, [mapRef, mapLoaded]);

  // Update circle whenever center, radius, or visibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !layersAddedRef.current) return;

    const source = map.getSource(SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (!visible || centerLon === null || centerLat === null) {
      // Clear the circle polygon
      source.setData({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: {},
      });
      return;
    }

    const circleGeoJSON = createCircleGeoJSON(centerLon, centerLat, radiusKm);
    source.setData(circleGeoJSON);
  }, [mapRef, mapLoaded, centerLon, centerLat, radiusKm, visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (!map) return;
      try {
        if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
        if (map.getLayer(OUTLINE_LAYER_ID)) map.removeLayer(OUTLINE_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map may already be destroyed — safe to ignore
      }
      layersAddedRef.current = false;
    };
  }, [mapRef]);
}
