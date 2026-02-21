import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { Coords } from "./useGeolocation";

export interface NearbyBusiness {
  id: string;
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  business_category_id?: string;
  cover_image_url?: string;
  is_active: boolean;
  is_suspended: boolean;
  timezone?: string;
  created_at?: string;
  distance_km: number;
}

interface UseNearbyBusinessesOptions {
  coords: Coords | null;
  radiusKm: number;
  enabled: boolean;
}

interface UseNearbyBusinessesReturn {
  data: NearbyBusiness[];
  loading: boolean;
  error: string | null;
}

export function useNearbyBusinesses({
  coords,
  radiusKm,
  enabled,
}: UseNearbyBusinessesOptions): UseNearbyBusinessesReturn {
  const [data, setData] = useState<NearbyBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Debounce timer ref to avoid spamming DB when slider moves
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !coords) {
      setData([]);
      return;
    }

    // Debounce: wait 500ms after last change before querying
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: result, error: rpcError } = await supabase.rpc(
          "get_businesses_near_location",
          {
            user_lat: coords.lat,
            user_lon: coords.lon,
            radius_km: radiusKm,
          },
        );

        if (rpcError) throw rpcError;
        setData((result as NearbyBusiness[]) || []);
      } catch (err) {
        console.error("Error fetching nearby businesses:", err);
        setError("No se pudieron cargar los negocios cercanos.");
        setData([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [coords, radiusKm, enabled]);

  return { data, loading, error };
}
