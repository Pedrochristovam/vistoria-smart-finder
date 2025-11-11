import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY, isGoogleMapsEnabled } from "@/lib/google-maps-config";

interface GoogleMapsAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export const GoogleMapsAutocomplete = ({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Digite o endereço...",
  className,
}: GoogleMapsAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isGoogleMapsEnabled()) {
      console.log("Google Maps não está habilitado. Verifique a chave da API no .env");
      return;
    }

    if (!inputRef.current || isInitialized) {
      return;
    }

    setIsLoading(true);

    const initializeAutocomplete = async () => {
      try {
        console.log("Inicializando Google Maps Autocomplete...");
        
        // Configurar opções globais
        setOptions({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: "weekly",
        });

        // Importar biblioteca Places
        const { Autocomplete } = await importLibrary("places");
        console.log("Google Maps carregado com sucesso!");

        if (inputRef.current) {
          const autocomplete = new Autocomplete(inputRef.current, {
            componentRestrictions: { country: "br" },
            fields: ["formatted_address", "geometry", "address_components"],
            types: ["address"],
          });

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            
            if (place.formatted_address) {
              console.log("Endereço selecionado:", place.formatted_address);
              onChange(place.formatted_address);
              if (onPlaceSelected) {
                onPlaceSelected(place);
              }
            }
          });

          autocompleteRef.current = autocomplete;
          setIsInitialized(true);
          console.log("Autocomplete inicializado e pronto para uso!");
        }
      } catch (error) {
        console.error("Erro ao carregar Google Maps Autocomplete:", error);
        console.error("Verifique se a chave da API está correta e se as APIs estão habilitadas no Google Cloud Console");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAutocomplete();
  }, [onChange, onPlaceSelected, isInitialized]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isGoogleMapsEnabled() ? "Digite o endereço e aguarde sugestões..." : placeholder}
        className={className}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
        {isLoading && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Carregando...</span>
          </>
        )}
        {!isLoading && isInitialized && isGoogleMapsEnabled() && (
          <MapPin className="h-4 w-4 text-primary" title="Autocompletar ativo" />
        )}
        {!isLoading && !isInitialized && isGoogleMapsEnabled() && (
          <MapPin className="h-4 w-4 text-muted-foreground" title="Inicializando..." />
        )}
      </div>
    </div>
  );
};

