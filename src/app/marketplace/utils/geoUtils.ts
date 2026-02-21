/**
 * Generates a GeoJSON polygon approximating a circle on the Earth's surface.
 * Uses spherical geometry (Haversine-based) for accurate real-world distances.
 *
 * @param centerLon - Longitude of the center point (degrees)
 * @param centerLat - Latitude of the center point (degrees)
 * @param radiusKm  - Radius in kilometers
 * @param points    - Number of polygon vertices (higher = smoother circle)
 */
export function createCircleGeoJSON(
  centerLon: number,
  centerLat: number,
  radiusKm: number,
  points = 80,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const EARTH_RADIUS_KM = 6371;
  const lat = (centerLat * Math.PI) / 180;
  const lon = (centerLon * Math.PI) / 180;
  const angularRadius = radiusKm / EARTH_RADIUS_KM;

  const coords: [number, number][] = [];

  for (let i = 0; i <= points; i++) {
    const bearing = ((i * 360) / points) * (Math.PI / 180);

    const lat2 = Math.asin(
      Math.sin(lat) * Math.cos(angularRadius) +
        Math.cos(lat) * Math.sin(angularRadius) * Math.cos(bearing),
    );
    const lon2 =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(lat),
        Math.cos(angularRadius) - Math.sin(lat) * Math.sin(lat2),
      );

    coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {},
  };
}
