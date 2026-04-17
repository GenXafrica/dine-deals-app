// src/lib/googleMapsLoader.ts

type WindowWithGoogle = Window & { google?: any; __gmaps_loader_injected?: boolean };

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const VERBOSE = (import.meta.env.VITE_GOOGLE_MAPS_VERBOSE as string | undefined) === "true";
const LIBRARIES = ["places"];

function buildSrc(key: string) {
  const libs = LIBRARIES.length ? `&libraries=${LIBRARIES.join(",")}` : "";
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}${libs}&v=weekly`;
}

export async function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return null;

  const win = window as WindowWithGoogle;

  if (win.google && win.google.maps) return win.google;

  if (win.__gmaps_loader_injected) {
    return new Promise((resolve) => {
      const check = () => {
        if (win.google && win.google.maps) return resolve(win.google);
        setTimeout(check, 100);
      };
      check();
    });
  }

  // ✅ FIXED: reject instead of returning null
  if (!KEY) {
    const err = new Error("[MapsError] Missing VITE_GOOGLE_MAPS_API_KEY");
    if (VERBOSE) console.error(err);
    return Promise.reject(err);
  }

  win.__gmaps_loader_injected = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = buildSrc(KEY);
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (win.google && win.google.maps) {
        resolve(win.google);
      } else {
        const err = new Error("[MapsError] google.maps missing after script load");
        if (VERBOSE) console.error(err);
        reject(err);
      }
    };

    script.onerror = (e) => {
      const err = new Error("[MapsError] Failed to load Google Maps script");
      if (VERBOSE) console.error(err, e);
      reject(err);
    };

    document.head.appendChild(script);
  });
}

export function isGoogleMapsAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!((window as WindowWithGoogle).google && (window as WindowWithGoogle).google.maps);
}