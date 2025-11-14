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
  endereco: z.string().min(10, "Endereço deve ter no mínimo 10 caracteres"),
  municipio: z.string().min(1, "Município é obrigatório"),
  estado: z.string().min(2, "Estado é obrigatório").max(2, "Digite apenas a sigla do estado"),
  servicos: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
});

interface BuscaVistoriaFormProps {
  onResultados: (
    empresas: EmpresaRankeada[], 
    coordenadasOrigem?: Coordinates,
    dadosBusca?: {
      endereco: string;
      municipio: string;
      estado: string;
      servicos: string[];
    }
  ) => void;
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

  // Extrair município e estado do endereço completo se não estiverem preenchidos
  const extrairMunicipioEstado = (endereco: string): { municipio: string; estado: string } => {
    // Padrão: cidade/estado (ex: Itaúna/MG)
    const cidadeEstadoMatch = endereco.match(/([^,]+?)\s*\/\s*([A-Z]{2})\b/);
    if (cidadeEstadoMatch) {
      return {
        municipio: cidadeEstadoMatch[1].trim(),
        estado: cidadeEstadoMatch[2].trim().toUpperCase()
      };
    }
    
    // Padrão: cidade, estado (ex: Itaúna, MG)
    const cidadeEstadoComMatch = endereco.match(/([^,]+?),\s*([A-Z]{2})\b/);
    if (cidadeEstadoComMatch) {
      return {
        municipio: cidadeEstadoComMatch[1].trim(),
        estado: cidadeEstadoComMatch[2].trim().toUpperCase()
      };
    }
    
    return { municipio: "", estado: "" };
  };

  // Auto-preenchimento de município e estado quando endereço completo é colado
  const handleEnderecoChange = (value: string) => {
    // Se município ou estado estão vazios, tentar extrair do endereço
    const municipioAtual = form.getValues("municipio");
    const estadoAtual = form.getValues("estado");
    
    if ((!municipioAtual || !estadoAtual || estadoAtual === "MG") && value.length > 10) {
      const extraido = extrairMunicipioEstado(value);
      if (extraido.municipio && extraido.estado) {
        if (!municipioAtual) {
          form.setValue("municipio", extraido.municipio);
        }
        if (!estadoAtual || estadoAtual === "MG") {
          form.setValue("estado", extraido.estado);
        }
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Se o endereço parece completo e município/estado não estão preenchidos, tentar extrair
      let municipioFinal = values.municipio;
      let estadoFinal = values.estado;
      let enderecoParaGeocodificar = values.endereco;
      
      // Se o endereço contém cidade/estado e os campos estão vazios, extrair
      if ((!municipioFinal || !estadoFinal) && values.endereco) {
        const extraido = extrairMunicipioEstado(values.endereco);
        if (extraido.municipio && extraido.estado) {
          municipioFinal = municipioFinal || extraido.municipio;
          estadoFinal = estadoFinal || extraido.estado;
        }
      }
      
      // Se ainda não tem município/estado, usar o endereço completo diretamente
      if (municipioFinal && estadoFinal) {
        enderecoParaGeocodificar = `${values.endereco}, ${municipioFinal}, ${estadoFinal}, Brasil`;
      } else {
        // Usar endereço completo como está (já pode conter tudo)
        enderecoParaGeocodificar = values.endereco;
      }
      
      // Geocodificar endereço da demanda
      const coordsDemanda = await geocodeAddress(enderecoParaGeocodificar);

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

      // Buscar o ID do estado selecionado (usar estado extraído ou o do formulário)
      let estadoId: string | null = null;
      const estadoParaBuscar = estadoFinal || values.estado;
      if (estadoParaBuscar && supabase) {
        const { data: estadoData } = await supabase
          .from("estados")
          .select("id")
          .eq("sigla", estadoParaBuscar.toUpperCase())
          .single();
        
        if (estadoData) {
          estadoId = estadoData.id;
          console.log(`📍 Estado selecionado: ${estadoParaBuscar} (ID: ${estadoId})`);
        } else {
          console.warn(`⚠️ Estado ${estadoParaBuscar} não encontrado no banco`);
        }
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

      // Buscar todos os serviços de uma vez para mapear IDs para nomes
      const { data: todosServicos } = await supabase
        .from("servicos")
        .select("id, nome");
      
      const servicosMap = new Map(
        (todosServicos || []).map((s: any) => [s.id, s.nome])
      );

      // Separar empresas que já têm coordenadas das que precisam geocodificar
      const empresasComCoords = empresasFiltradas.filter((e: any) => e.latitude && e.longitude);
      const empresasSemCoords = empresasFiltradas.filter((e: any) => !e.latitude || !e.longitude);

      // Geocodificar apenas as que não têm coordenadas (em paralelo)
      const geocodificacoes = await Promise.all(
        empresasSemCoords.map(async (empresa: any) => {
          const coords = await geocodeAddress(empresa.endereco);
          return { empresa, coords };
        })
      );

      // Combinar todas as empresas com suas coordenadas
      const todasEmpresas = [
        ...empresasComCoords.map((e: any) => ({
          empresa: e,
          coords: { lat: parseFloat(e.latitude), lng: parseFloat(e.longitude) } as Coordinates
        })),
        ...geocodificacoes
      ];

      // Calcular distâncias e scores (em paralelo)
      const empresasComDistancia = await Promise.all(
        todasEmpresas.map(async ({ empresa, coords }) => {
          // Extrair serviços da empresa usando o map
          const servicosEmpresa = (empresa.empresa_servicos || [])
            .map((es: any) => {
              const servicoId = es.servico_id || es.servicos?.id;
              const nome = servicosMap.get(servicoId);
              return nome ? { id: servicoId, nome } : null;
            })
            .filter((s: any) => s !== null) as Array<{ id: string; nome: string }>;

          const coordsEmpresa = coords;

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

          // Regra especial para Belo Horizonte: priorizar proximidade E menos chamadas
          const municipioParaRegra = municipioFinal || values.municipio;
          const estadoParaRegra = estadoFinal || values.estado;
          const municipioLower = municipioParaRegra.toLowerCase();
          const isBeloHorizonte = municipioLower.includes("belo horizonte") || 
                                   municipioLower.includes("bh") ||
                                   municipioLower === "b.h." ||
                                   municipioLower === "b.h";

          if (isBeloHorizonte && estadoParaRegra.toUpperCase() === "MG") {
            // Para BH: priorizar muito mais empresas com menos chamadas
            // Quanto menos chamadas, maior o bônus
            const bonusPorMenosChamadas = (100 - empresa.chamadas_count) * 5;
            score += bonusPorMenosChamadas;
            
            // Penalizar mais por distância em BH
            score -= distancia * 2;
            
            motivo = `${motivo}. BH: ${empresa.chamadas_count} chamada(s) anterior(es) - priorizando menos chamadas e proximidade`;
          } else if (estadoParaRegra.toUpperCase() === "MG") {
            // Para outros municípios de MG, manter lógica anterior
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
            servicos: servicosEmpresa,
          };
        })
      );

      // Rankear empresas por score (proximidade + regras de negócio)
      const empresasRankeadas: EmpresaRankeada[] = empresasComDistancia
        .sort((a, b) => b.score - a.score);
      
      const enderecoCompletoFinal = municipioFinal && estadoFinal 
        ? `${values.endereco}, ${municipioFinal}, ${estadoFinal}, Brasil`
        : values.endereco;
      
      onResultados(
        empresasRankeadas, 
        coordsDemanda,
        {
          endereco: enderecoCompletoFinal,
          municipio: municipioFinal || values.municipio,
          estado: estadoFinal || values.estado,
          servicos: values.servicos,
        }
      );

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
                      onChange={(value) => {
                        field.onChange(value);
                        handleEnderecoChange(value);
                      }}
                      placeholder="Digite o endereço completo (ex: Rua Exemplo, 123, Bairro, Cidade/UF CEP 12345-678)..."
                    />
                  ) : (
                    <Input 
                      placeholder="Rua, Número, Bairro, Cidade/UF (ex: Rua Evaristo Norato, 96/302, B. Residencial São Geraldo, Itaúna/MG CEP 35.680-452)" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleEnderecoChange(e.target.value);
                      }}
                    />
                  )}
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  💡 Você pode colar o endereço completo. O sistema extrairá automaticamente município e estado se estiverem no formato "Cidade/UF" ou "Cidade, UF".
                </p>
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
