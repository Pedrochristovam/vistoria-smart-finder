import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X, MapPin } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";
import { defaultServicos, defaultRegioesMG, defaultEstados } from "@/lib/default-data";

const formSchema = z.object({
  ordem: z.coerce.number().min(1, "Ordem deve ser maior que 0"),
  numero_contrato: z.string().min(1, "Número do contrato é obrigatório"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  endereco: z.string().min(5, "Endereço deve ter no mínimo 5 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(8, "Telefone inválido"),
  responsavel: z.string().min(3, "Nome do responsável é obrigatório"),
  servicos: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
  regioes_mg: z.array(z.string()),
  estados: z.array(z.string()), // Opcional - pode ser vazio ou ter "nenhum"
});

interface NovaEmpresaFormProps {
  onSuccess: () => void;
}

export const NovaEmpresaForm = ({ onSuccess }: NovaEmpresaFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [servicos, setServicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [regioesMg, setRegioesMg] = useState<Array<{ id: string; nome: string }>>([]);
  const [estados, setEstados] = useState<Array<{ id: string; sigla: string; nome: string }>>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ordem: 1,
      numero_contrato: "",
      nome: "",
      endereco: "",
      email: "",
      telefone: "",
      responsavel: "",
      servicos: [],
      regioes_mg: [],
      estados: [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) {
        console.warn("Supabase não configurado. Usando dados padrão.");
        // Usar dados padrão quando Supabase não estiver configurado
        setServicos(defaultServicos);
        setRegioesMg(defaultRegioesMG);
        setEstados(defaultEstados);
        return;
      }

      try {
        const [servicosRes, regioesRes, estadosRes] = await Promise.all([
          supabase.from("servicos").select("*").order("ordem"),
          supabase.from("regioes_mg").select("*").order("nome"),
          supabase.from("estados").select("*").order("sigla"),
        ]);
        
        // Usar dados do banco se disponíveis, senão usar padrão
        setServicos(servicosRes.data && servicosRes.data.length > 0 ? servicosRes.data : defaultServicos);
        setRegioesMg(regioesRes.data && regioesRes.data.length > 0 ? regioesRes.data : defaultRegioesMG);
        setEstados(estadosRes.data && estadosRes.data.length > 0 ? estadosRes.data : defaultEstados);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        // Usar dados padrão em caso de erro
        setServicos(defaultServicos);
        setRegioesMg(defaultRegioesMG);
        setEstados(defaultEstados);
      }
    };
    loadData();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (!supabase) {
        toast.error(
          "Supabase não configurado. Para cadastrar empresas, você precisa:\n" +
          "1. Criar um projeto em https://app.supabase.com\n" +
          "2. Adicionar VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env\n" +
          "3. Executar as migrations no Supabase",
          { duration: 8000 }
        );
        setIsLoading(false);
        return;
      }

      // Geocodificar endereço para obter coordenadas
      toast.info("Geocodificando endereço...");
      console.log("🔍 Tentando geocodificar:", values.endereco);
      
      // Tentar geocodificar o endereço fornecido
      let coords = await geocodeAddress(values.endereco);
      console.log("📍 Resultado primeira tentativa:", coords);
      
      // Se não encontrou, tentar variações do endereço
      if (!coords) {
        // Tentar com "Brasil" se não tiver
        if (!values.endereco.toLowerCase().includes("brasil")) {
          const enderecoComBrasil = `${values.endereco}, Brasil`;
          console.log("🔍 Tentativa 2 - Com Brasil:", enderecoComBrasil);
          coords = await geocodeAddress(enderecoComBrasil);
          console.log("📍 Resultado segunda tentativa:", coords);
        }
        
        // Tentar sem abreviações
        if (!coords) {
          const enderecoSemAbrev = values.endereco
            .replace(/\bB\.\b/gi, "Bairro")
            .replace(/\bR\.\b/gi, "Rua")
            .replace(/\bAv\.\b/gi, "Avenida");
          if (enderecoSemAbrev !== values.endereco) {
            console.log("🔍 Tentativa 3 - Sem abreviações:", enderecoSemAbrev);
            coords = await geocodeAddress(enderecoSemAbrev);
            console.log("📍 Resultado terceira tentativa:", coords);
          }
        }
        
        // Tentar apenas com cidade e estado
        if (!coords) {
          const match = values.endereco.match(/(.+?),\s*([^,]+),\s*([A-Z]{2})/);
          if (match) {
            const [, rua, cidade, estado] = match;
            const enderecoSimplificado = `${rua.trim()}, ${cidade.trim()}, ${estado}, Brasil`;
            console.log("🔍 Tentativa 4 - Simplificado:", enderecoSimplificado);
            coords = await geocodeAddress(enderecoSimplificado);
            console.log("📍 Resultado quarta tentativa:", coords);
          }
        }
      }
      
      if (!coords) {
        console.warn("⚠️ Não foi possível geocodificar o endereço");
        
        // Perguntar se deseja continuar sem coordenadas
        const continuar = window.confirm(
          "Não foi possível localizar o endereço automaticamente.\n\n" +
          "Deseja continuar o cadastro sem coordenadas?\n\n" +
          "A empresa será cadastrada, mas não aparecerá nas buscas por proximidade até que o endereço seja corrigido."
        );
        
        if (!continuar) {
          setIsLoading(false);
          return;
        }
        
        // Continuar sem coordenadas (será null)
        toast.warning("Empresa será cadastrada sem coordenadas. Você pode editar depois.");
      } else {
        console.log("✅ Coordenadas obtidas:", coords);
        toast.success("Endereço localizado com sucesso!");
      }

      // Inserir empresa com ou sem coordenadas
      const empresaDataToInsert: any = {
        ordem: values.ordem,
        numero_contrato: values.numero_contrato,
        nome: values.nome,
        endereco: values.endereco,
        email: values.email,
        telefone: values.telefone,
        responsavel: values.responsavel,
        chamadas_count: 0,
      };
      
      // Adicionar coordenadas apenas se foram obtidas
      if (coords) {
        empresaDataToInsert.latitude = coords.lat;
        empresaDataToInsert.longitude = coords.lng;
      }
      
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .insert([empresaDataToInsert])
        .select()
        .single();

      if (empresaError) throw empresaError;

      // Inserir relações de serviços
      const servicosInserts = values.servicos.map((servicoId) => ({
        empresa_id: empresaData.id,
        servico_id: servicoId,
      }));
      
      const { error: servicosError } = await supabase
        .from("empresa_servicos")
        .insert(servicosInserts);
      
      if (servicosError) throw servicosError;

      // Inserir relações de regiões MG
      if (values.regioes_mg.length > 0) {
        const regioesInserts = values.regioes_mg.map((regiaoId) => ({
          empresa_id: empresaData.id,
          regiao_id: regiaoId,
        }));
        
        const { error: regioesError } = await supabase
          .from("empresa_regioes_mg")
          .insert(regioesInserts);
        
        if (regioesError) throw regioesError;
      }

      // Inserir relações de estados (apenas se não for "nenhum" e houver estados selecionados)
      const estadosParaInserir = values.estados.filter((estadoId) => estadoId !== "nenhum");
      
      if (estadosParaInserir.length > 0) {
        const estadosInserts = estadosParaInserir.map((estadoId) => ({
          empresa_id: empresaData.id,
          estado_id: estadoId,
        }));
        
        const { error: estadosError } = await supabase
          .from("empresa_estados")
          .insert(estadosInserts);
        
        if (estadosError) throw estadosError;
      }

      toast.success("Empresa cadastrada com sucesso!");
      form.reset();
      onSuccess();
      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao cadastrar empresa:", error);
      if (error.code === "23505") {
        toast.error("Já existe uma empresa com esta ordem ou número de contrato");
      } else {
        toast.error("Erro ao cadastrar empresa. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-2 border-dashed p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cadastrar Nova Empresa</h3>
        <Button variant="ghost" size="icon" onClick={onSuccess}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="ordem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numero_contrato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº Contrato</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="endereco"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Endereço Completo
                </FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    rows={3}
                    placeholder="Ex: Rua Rafael Magalhães, 179, B. Santo Antonio, Belo Horizonte, MG"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Inclua rua, número, bairro, cidade e estado para melhor precisão
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Quadro de Atividades</h4>
            <FormField
              control={form.control}
              name="servicos"
              render={() => (
                <FormItem>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {servicos.map((servico) => (
                      <FormField
                        key={servico.id}
                        control={form.control}
                        name="servicos"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 hover:bg-secondary/50">
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
                            <FormLabel className="cursor-pointer font-normal">{servico.nome}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Quadro de Municípios (Regiões de MG)</h4>
            <FormField
              control={form.control}
              name="regioes_mg"
              render={() => (
                <FormItem>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {regioesMg.map((regiao) => (
                      <FormField
                        key={regiao.id}
                        control={form.control}
                        name="regioes_mg"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 hover:bg-secondary/50">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(regiao.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, regiao.id])
                                    : field.onChange(field.value?.filter((value) => value !== regiao.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer font-normal">{regiao.nome}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Quadro de Estados da Federação</h4>
            <FormField
              control={form.control}
              name="estados"
              render={() => (
                <FormItem>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                    {/* Opção "Nenhum" */}
                    <FormField
                      control={form.control}
                      name="estados"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 hover:bg-secondary/50 bg-secondary/20">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.length === 0 || field.value?.includes("nenhum")}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Se marcar "Nenhum", limpar todos os outros
                                  field.onChange(["nenhum"]);
                                } else {
                                  // Se desmarcar "Nenhum", limpar tudo
                                  field.onChange([]);
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer text-xs font-normal font-semibold">Nenhum</FormLabel>
                        </FormItem>
                      )}
                    />
                    {/* Estados */}
                    {estados.map((estado) => (
                      <FormField
                        key={estado.id}
                        control={form.control}
                        name="estados"
                        render={({ field }) => {
                          const isNenhumSelected = field.value?.includes("nenhum");
                          return (
                            <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 hover:bg-secondary/50">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(estado.id)}
                                  disabled={isNenhumSelected}
                                  onCheckedChange={(checked) => {
                                    // Se "Nenhum" estiver selecionado, não permitir selecionar estados
                                    if (isNenhumSelected && checked) {
                                      return;
                                    }
                                    // Remover "nenhum" se selecionar qualquer estado
                                    const newValue = field.value?.filter((v) => v !== "nenhum") || [];
                                    return checked
                                      ? field.onChange([...newValue, estado.id])
                                      : field.onChange(newValue.filter((value) => value !== estado.id));
                                  }}
                                />
                              </FormControl>
                              <FormLabel className={`cursor-pointer text-xs font-normal ${isNenhumSelected ? "opacity-50" : ""}`}>
                                {estado.sigla}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-6" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar Empresa"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};
