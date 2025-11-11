import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, MapPin } from "lucide-react";
import type { EmpresaRankeada } from "@/pages/Index";
import { geocodeAddress, calculateDistance, Coordinates } from "@/lib/geocoding";
import { GoogleMapsAutocomplete } from "./GoogleMapsAutocomplete";
import { isGoogleMapsEnabled } from "@/lib/google-maps-config";
import { calculateDistanceAndTime } from "@/lib/google-maps-distance";
import { defaultServicos } from "@/lib/default-data";

const formSchema = z.object({
  endereco: z.string().min(5, "Endereço deve ter no mínimo 5 caracteres"),
  municipio: z.string().min(2, "Município é obrigatório"),
  estado: z.string().length(2, "Sigla do estado (ex: MG)"),
  servicos: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
});

interface BuscaVistoriaFormProps {
  onResultados: (empresas: EmpresaRankeada[], coordenadasOrigem?: Coordinates) => void;
}

export const BuscaVistoriaForm = ({ onResultados }: BuscaVistoriaFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [servicos, setServicos] = useState<Array<{ id: string; nome: string }>>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      endereco: "",
      municipio: "",
      estado: "MG",
      servicos: [],
    },
  });

  // Carregar serviços disponíveis
  useEffect(() => {
    const loadServicos = async () => {
      if (!supabase) {
        console.warn("Supabase não configurado. Usando dados padrão.");
        // Usar dados padrão quando Supabase não estiver configurado
        setServicos(defaultServicos);
        return;
      }
      try {
        const { data } = await supabase
          .from("servicos")
          .select("*")
          .order("ordem");
        if (data && data.length > 0) {
          setServicos(data);
        } else {
          // Fallback para dados padrão se não houver dados no banco
          setServicos(defaultServicos);
        }
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        // Usar dados padrão em caso de erro
        setServicos(defaultServicos);
      }
    };
    loadServicos();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Geocodificar endereço da demanda
      const enderecoCompleto = `${values.endereco}, ${values.municipio}, ${values.estado}, Brasil`;
      const coordsDemanda = await geocodeAddress(enderecoCompleto);

      if (!coordsDemanda) {
        toast.error("Não foi possível localizar o endereço. Verifique os dados informados.");
        setIsLoading(false);
        return;
      }

      if (!supabase) {
        toast.error("Supabase não configurado. Configure as variáveis de ambiente no arquivo .env");
        setIsLoading(false);
        return;
      }

      // Buscar o ID do estado selecionado
      let estadoId: string | null = null;
      const { data: estadoData } = await supabase
        .from("estados")
        .select("id")
        .eq("sigla", values.estado.toUpperCase())
        .single();

      if (estadoData) {
        estadoId = estadoData.id;
        console.log(`📍 Estado selecionado: ${values.estado} (ID: ${estadoId})`);
      } else {
        console.warn(`⚠️ Estado ${values.estado} não encontrado no banco`);
      }

      // Buscar empresas com seus serviços e estados
      const { data: empresasData, error } = await supabase
        .from("empresas")
        .select(`
          *,
          empresa_servicos(servico_id),
          empresa_estados(estado_id)
        `);

      if (error) {
        console.error("Erro ao buscar empresas:", error);
        throw error;
      }

      console.log("📊 Total de empresas encontradas:", empresasData?.length || 0);

      // Filtrar empresas que oferecem TODOS os serviços solicitados E atendem ao estado
      const empresasFiltradas = empresasData?.filter((empresa: any) => {
        // Verificar serviços - empresa deve ter TODOS os serviços solicitados
        const servicosEmpresa = (empresa.empresa_servicos || []).map((es: any) => es.servico_id);
        const temTodosServicos = values.servicos.every((servicoId) => servicosEmpresa.includes(servicoId));
        
        if (!temTodosServicos) {
          return false;
        }

        // Verificar estados
        const estadosEmpresa = (empresa.empresa_estados || []).map((ee: any) => ee.estado_id);
        
        // Se a empresa não tem estados cadastrados (marcou "Nenhum"), aceitar
        if (estadosEmpresa.length === 0) {
          return true;
        }

        // Se tem estados cadastrados, verificar se atende ao estado solicitado
        if (estadoId && estadosEmpresa.includes(estadoId)) {
          return true;
        }

        return false;
      }) || [];

      console.log("✅ Empresas filtradas:", empresasFiltradas.length);

      // Geocodificar endereços das empresas e calcular distâncias
      const empresasComDistancia = await Promise.all(
        empresasFiltradas.map(async (empresa: any) => {
          // Usar coordenadas salvas se disponíveis, senão geocodificar
          let coordsEmpresa: Coordinates | null = null;
          
          if (empresa.latitude && empresa.longitude) {
            coordsEmpresa = {
              lat: parseFloat(empresa.latitude),
              lng: parseFloat(empresa.longitude),
            };
          } else {
            coordsEmpresa = await geocodeAddress(empresa.endereco);
            // Se geocodificou com sucesso, salvar no banco (opcional - pode fazer depois)
          }

          let distancia = 0;
          let distanciaTexto = "N/A";
          let tempo = "N/A";
          let score = 100;
          let motivo = "Atende aos serviços solicitados";
          
          if (coordsEmpresa && coordsDemanda) {
            // Calcular distância e tempo usando Google Maps se disponível
            try {
              const distanciaResult = await calculateDistanceAndTime(coordsDemanda, coordsEmpresa);
              
              if (distanciaResult.distanciaValor > 0) {
                distancia = distanciaResult.distanciaValor;
                distanciaTexto = distanciaResult.distancia;
                tempo = distanciaResult.tempo;
              } else {
                // Fallback para cálculo Haversine
                distancia = calculateDistance(coordsDemanda, coordsEmpresa);
                distanciaTexto = distancia < 1 ? `${Math.round(distancia * 1000)}m` : `${distancia.toFixed(1)} km`;
              }
            } catch (error) {
              console.warn("Erro ao calcular distância com Google Maps, usando Haversine:", error);
              // Fallback para cálculo Haversine
              distancia = calculateDistance(coordsDemanda, coordsEmpresa);
              distanciaTexto = distancia < 1 ? `${Math.round(distancia * 1000)}m` : `${distancia.toFixed(1)} km`;
            }
          } else {
            // Se não tem coordenadas, ainda pode aparecer mas sem distância
            console.warn(`⚠️ ${empresa.nome} não tem coordenadas cadastradas`);
            motivo = `${motivo}. Coordenadas não disponíveis`;
          }

          // Penalizar por distância (quanto mais longe, menor o score)
          score -= distancia * 0.5;
          motivo = `${motivo}. Localizada a ${distanciaTexto} do local da vistoria`;

          // Se for Minas Gerais, priorizar empresas com menos chamadas
          if (values.estado.toUpperCase() === "MG") {
            score -= empresa.chamadas_count * 3;
            motivo = `${motivo}. ${empresa.chamadas_count} chamada(s) anterior(es)`;
          }

          return {
            id: empresa.id,
            nome: empresa.nome,
            endereco: empresa.endereco,
            email: empresa.email,
            telefone: empresa.telefone,
            responsavel: empresa.responsavel,
            chamadas_count: empresa.chamadas_count,
            score,
            motivo,
            distancia,
            distanciaTexto,
            tempo,
            coordenadas: coordsEmpresa || undefined,
          };
        })
      );

      // Rankear empresas por score (proximidade + regras de negócio)
      const empresasRankeadas: EmpresaRankeada[] = empresasComDistancia
        .sort((a, b) => b.score - a.score);

      onResultados(empresasRankeadas, coordsDemanda);

      if (empresasRankeadas.length === 0) {
        toast.error("Nenhuma empresa encontrada com os critérios especificados");
      } else {
        toast.success(`${empresasRankeadas.length} empresa(s) encontrada(s) e ordenada(s) por proximidade`);
      }
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
      toast.error("Erro ao buscar empresas. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="endereco"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Endereço da Vistoria
                  {isGoogleMapsEnabled() && (
                    <span className="text-xs text-muted-foreground font-normal">(com autocompletar)</span>
                  )}
                </FormLabel>
                <FormControl>
                  {isGoogleMapsEnabled() ? (
                    <GoogleMapsAutocomplete
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Digite o endereço completo..."
                    />
                  ) : (
                    <Input placeholder="Rua, Número, Bairro..." {...field} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="municipio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Município</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Belo Horizonte" {...field} className="shadow-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="estado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado (Sigla)</FormLabel>
              <FormControl>
                <Input placeholder="Ex: MG" maxLength={2} {...field} className="uppercase shadow-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="servicos"
          render={() => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Serviços Necessários</FormLabel>
              <div className="grid gap-3 md:grid-cols-2 p-4 rounded-lg bg-secondary/20 border border-secondary/30">
                {servicos.map((servico) => (
                  <FormField
                    key={servico.id}
                    control={form.control}
                    name="servicos"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-md p-2 hover:bg-secondary/40 transition-colors">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(servico.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, servico.id])
                                : field.onChange(field.value?.filter((value) => value !== servico.id));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">{servico.nome}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full gap-2 h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all" 
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando empresas próximas...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Buscar Empresas Próximas
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};
