import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2 } from "lucide-react";
import type { EmpresaRankeada } from "@/pages/Index";
import { geocodeAddress, calculateDistance } from "@/lib/geocoding";

const formSchema = z.object({
  endereco: z.string().min(5, "Endereço deve ter no mínimo 5 caracteres"),
  municipio: z.string().min(2, "Município é obrigatório"),
  estado: z.string().length(2, "Sigla do estado (ex: MG)"),
  servicos: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
});

interface BuscaVistoriaFormProps {
  onResultados: (empresas: EmpresaRankeada[]) => void;
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
  useState(() => {
    const loadServicos = async () => {
      const { data } = await supabase
        .from("servicos")
        .select("*")
        .order("ordem");
      if (data) setServicos(data);
    };
    loadServicos();
  });

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

      // Buscar empresas que atendem aos critérios
      const { data: empresasData, error } = await supabase
        .from("empresas")
        .select(`
          *,
          empresa_servicos!inner(servico_id),
          empresa_estados!inner(estado_id)
        `);

      if (error) throw error;

      // Filtrar empresas que oferecem os serviços solicitados
      const empresasFiltradas = empresasData?.filter((empresa: any) => {
        const servicosEmpresa = empresa.empresa_servicos.map((es: any) => es.servico_id);
        return values.servicos.every((servicoId) => servicosEmpresa.includes(servicoId));
      }) || [];

      // Geocodificar endereços das empresas e calcular distâncias
      const empresasComDistancia = await Promise.all(
        empresasFiltradas.map(async (empresa: any) => {
          const coordsEmpresa = await geocodeAddress(empresa.endereco);
          let distancia = 0;
          
          if (coordsEmpresa && coordsDemanda) {
            distancia = calculateDistance(coordsDemanda, coordsEmpresa);
          }

          let score = 100;
          let motivo = "Atende aos serviços solicitados";

          // Penalizar por distância (quanto mais longe, menor o score)
          score -= distancia * 0.5;
          motivo = `${motivo}. Localizada a ${distancia.toFixed(1)} km do local da vistoria`;

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
          };
        })
      );

      // Rankear empresas por score (proximidade + regras de negócio)
      const empresasRankeadas: EmpresaRankeada[] = empresasComDistancia
        .sort((a, b) => b.score - a.score);

      onResultados(empresasRankeadas);

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
                <FormLabel>Endereço da Vistoria</FormLabel>
                <FormControl>
                  <Input placeholder="Rua, Número, Bairro..." {...field} />
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
                  <Input placeholder="Ex: Belo Horizonte" {...field} />
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
                <Input placeholder="Ex: MG" maxLength={2} {...field} className="uppercase" />
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
              <FormLabel>Serviços Necessários</FormLabel>
              <div className="grid gap-3 md:grid-cols-2">
                {servicos.map((servico) => (
                  <FormField
                    key={servico.id}
                    control={form.control}
                    name="servicos"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
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
                        <FormLabel className="font-normal">{servico.nome}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full gap-2" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Buscar Empresas
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};
