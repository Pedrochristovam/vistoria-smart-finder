import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY, isGoogleMapsEnabled } from "@/lib/google-maps-config";
import { Coordinates } from "@/lib/geocoding";

interface MapaRotaProps {
  origem: Coordinates;
  destino: Coordinates;
  nomeEmpresa: string;
  enderecoEmpresa: string;
  className?: string;
}

export const MapaRota = ({
  origem,
  destino,
  nomeEmpresa,
  enderecoEmpresa,
  className = "h-64 w-full rounded-lg",
}: MapaRotaProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!isGoogleMapsEnabled() || !mapRef.current) {
      return;
    }

    const initializeMap = async () => {
      try {
        // Configurar opções globais
        setOptions({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: "weekly",
        });

        // Importar bibliotecas necessárias
        const [{ Map }, { DirectionsService, DirectionsRenderer }, { LatLngBounds }] = await Promise.all([
          importLibrary("maps"),
          importLibrary("routes"),
          importLibrary("core"),
        ]);

        if (!mapRef.current) return;

        // Criar mapa
        const map = new Map(mapRef.current, {
          center: {
            lat: (origem.lat + destino.lat) / 2,
            lng: (origem.lng + destino.lng) / 2,
          },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
        });

        mapInstanceRef.current = map;

        // Criar serviço de rotas
        const directionsService = new DirectionsService();
        const directionsRenderer = new DirectionsRenderer({
          map,
          suppressMarkers: false,
        });

        directionsServiceRef.current = directionsService;
        directionsRendererRef.current = directionsRenderer;

        // Calcular e exibir rota
        directionsService.route(
          {
            origin: { lat: origem.lat, lng: origem.lng },
            destination: { lat: destino.lat, lng: destino.lng },
            travelMode: "DRIVING" as any,
            language: "pt-BR",
          },
          (result: any, status: string) => {
            if (status === "OK" && result) {
              directionsRenderer.setDirections(result);
              
              // Ajustar zoom para mostrar toda a rota
              const bounds = new LatLngBounds();
              result.routes[0].legs.forEach((leg: any) => {
                bounds.extend(leg.start_location);
                bounds.extend(leg.end_location);
              });
              map.fitBounds(bounds);
            } else {
              console.error("Erro ao calcular rota:", status);
              // Se falhar, apenas ajustar zoom para mostrar ambos os pontos
              const bounds = new LatLngBounds();
              bounds.extend({ lat: origem.lat, lng: origem.lng });
              bounds.extend({ lat: destino.lat, lng: destino.lng });
              map.fitBounds(bounds);
            }
          }
        );
      } catch (error) {
        console.error("Erro ao inicializar mapa:", error);
      }
    };

    initializeMap();
  }, [origem, destino, nomeEmpresa]);

  if (!isGoogleMapsEnabled()) {
    return (
      <div className={`${className} bg-secondary/20 flex items-center justify-center border-2 border-dashed`}>
        <p className="text-sm text-muted-foreground text-center px-4">
          Mapa não disponível. Configure a chave do Google Maps para visualizar rotas.
        </p>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
};

