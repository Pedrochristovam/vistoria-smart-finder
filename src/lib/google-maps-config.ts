// Configuração para Google Maps API
// Para usar, defina a variável de ambiente VITE_GOOGLE_MAPS_API_KEY
// ou configure diretamente aqui (não recomendado para produção)

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export const isGoogleMapsEnabled = () => {
  const hasKey = GOOGLE_MAPS_API_KEY.length > 0;
  if (hasKey) {
    console.log("✅ Google Maps API está habilitada");
  } else {
    console.log("⚠️ Google Maps API não está configurada. Usando fallback (OpenStreetMap)");
  }
  return hasKey;
};

