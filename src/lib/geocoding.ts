// Geocoding utilities for address distance calculation
// Uses Google Maps Geocoding API REST directly, falls back to OpenStreetMap

import { GOOGLE_MAPS_API_KEY, isGoogleMapsEnabled } from "./google-maps-config";

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Geocode address using Google Maps Geocoding API REST
 */
async function geocodeWithGoogleMapsREST(address: string): Promise<Coordinates | null> {
  if (!isGoogleMapsEnabled()) {
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&region=br&language=pt-BR`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log("✅ Google Maps REST localizou:", data.results[0].formatted_address);
      console.log("📍 Coordenadas:", location.lat, location.lng);
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      console.warn("⚠️ Google Maps REST não encontrou:", address);
      console.warn("Status:", data.status, data.error_message || "");
      return null;
    }
  } catch (error) {
    console.error("Erro ao geocodificar com Google Maps REST:", error);
    return null;
  }
}

/**
 * Convert address to coordinates using Google Maps API REST or fallback to OpenStreetMap
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  // Normalizar endereço - remover espaços extras e garantir formato
  const normalizedAddress = address.trim().replace(/\s+/g, " ");
  
  // Try Google Maps REST API first if available
  if (isGoogleMapsEnabled()) {
    const coords = await geocodeWithGoogleMapsREST(normalizedAddress);
    if (coords) {
      return coords;
    }
    // Se Google Maps falhou, tentar OpenStreetMap
    console.log("🔄 Tentando fallback para OpenStreetMap...");
  }

  // Fallback to OpenStreetMap
  return geocodeWithOpenStreetMap(normalizedAddress);
}

/**
 * Fallback geocoding using OpenStreetMap (Nominatim)
 */
async function geocodeWithOpenStreetMap(address: string): Promise<Coordinates | null> {
  try {
    // Remover "Brasil" se estiver no final (pode confundir a busca)
    let searchAddress = address.replace(/,\s*Brasil$/i, "").trim();
    
    // Tentar diferentes variações do endereço
    const variations = [
      searchAddress,
      `${searchAddress}, Brasil`,
      searchAddress.replace(/\bB\.\b/gi, "Bairro"),
      searchAddress.replace(/\bR\.\b/gi, "Rua"),
    ];
    
    for (const variation of variations) {
      const encodedAddress = encodeURIComponent(variation);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=3&countrycodes=br&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'InspectionSystem/1.0',
          'Accept-Language': 'pt-BR,pt,en'
        }
      });
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Procurar resultado mais relevante (que tenha cidade/estado)
        const bestMatch = data.find((item: any) => 
          item.address && (item.address.city || item.address.town || item.address.state)
        ) || data[0];
        
        console.log("✅ Endereço localizado via OpenStreetMap:", bestMatch.display_name);
        console.log("📍 Coordenadas:", bestMatch.lat, bestMatch.lon);
        return {
          lat: parseFloat(bestMatch.lat),
          lng: parseFloat(bestMatch.lon),
        };
      }
      
      // Aguardar um pouco entre tentativas (rate limiting do Nominatim)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.warn("⚠️ Endereço não encontrado após todas as variações:", searchAddress);
    return null;
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)} km`;
}
