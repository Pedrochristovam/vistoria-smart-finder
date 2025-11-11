// Funções para calcular distância e tempo usando Google Maps Distance Matrix API
import { GOOGLE_MAPS_API_KEY, isGoogleMapsEnabled } from "./google-maps-config";
import { Coordinates } from "./geocoding";

export interface DistanceResult {
  distancia: string; // Ex: "15.3 km"
  distanciaValor: number; // Em km
  tempo: string; // Ex: "25 min"
  tempoValor: number; // Em minutos
}

/**
 * Calcula distância e tempo de viagem usando Google Maps Distance Matrix API
 */
export async function calculateDistanceAndTime(
  origem: Coordinates,
  destino: Coordinates
): Promise<DistanceResult> {
  if (!isGoogleMapsEnabled()) {
    // Fallback: usar cálculo Haversine simples (sem tempo)
    const distancia = calculateHaversineDistance(origem, destino);
    return {
      distancia: distancia < 1 ? `${Math.round(distancia * 1000)}m` : `${distancia.toFixed(1)} km`,
      distanciaValor: distancia,
      tempo: "N/A",
      tempoValor: 0,
    };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?` +
        `origins=${origem.lat},${origem.lng}` +
        `&destinations=${destino.lat},${destino.lng}` +
        `&key=${GOOGLE_MAPS_API_KEY}` +
        `&language=pt-BR` +
        `&units=metric`
    );

    const data = await response.json();

    // Verificar se há erro de billing
    if (data.status === "REQUEST_DENIED") {
      console.warn("⚠️ Google Maps Distance Matrix: Billing não habilitado. Usando cálculo Haversine.");
      const distancia = calculateHaversineDistance(origem, destino);
      return {
        distancia: distancia < 1 ? `${Math.round(distancia * 1000)}m` : `${distancia.toFixed(1)} km`,
        distanciaValor: distancia,
        tempo: "N/A (habilite billing para ver tempo)",
        tempoValor: 0,
      };
    }

    if (data.status === "OK" && data.rows[0]?.elements[0]?.status === "OK") {
      const element = data.rows[0].elements[0];
      const distanciaTexto = element.distance.text;
      const tempoTexto = element.duration.text;
      const distanciaValor = element.distance.value / 1000; // Converter metros para km
      const tempoValor = element.duration.value / 60; // Converter segundos para minutos

      console.log("✅ Distância calculada via Google Maps:", distanciaTexto, tempoTexto);
      return {
        distancia: distanciaTexto,
        distanciaValor: Math.round(distanciaValor * 10) / 10,
        tempo: tempoTexto,
        tempoValor: Math.round(tempoValor),
      };
    }

    console.warn("⚠️ Google Maps Distance Matrix retornou status:", data.status);
    // Se falhar, usar Haversine como fallback
    const distancia = calculateHaversineDistance(origem, destino);
    return {
      distancia: distancia < 1 ? `${Math.round(distancia * 1000)}m` : `${distancia.toFixed(1)} km`,
      distanciaValor: distancia,
      tempo: "N/A",
      tempoValor: 0,
    };
  } catch (error) {
    console.error("Erro ao calcular distância com Google Maps:", error);
    // Fallback para Haversine
    const distancia = calculateHaversineDistance(origem, destino);
    return {
      distancia: distancia < 1 ? `${Math.round(distancia * 1000)}m` : `${distancia.toFixed(1)} km`,
      distanciaValor: distancia,
      tempo: "N/A",
      tempoValor: 0,
    };
  }
}

/**
 * Calcula distância usando fórmula de Haversine (fallback)
 */
function calculateHaversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Raio da Terra em km
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

  return Math.round(distance * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

