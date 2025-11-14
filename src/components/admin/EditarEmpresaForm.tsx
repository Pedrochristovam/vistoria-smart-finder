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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";
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
  chamadas_count: z.coerce.number().min(0, "Número de chamadas deve ser maior ou igual a 0").default(0),
  servicos: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
  regioes_mg: z.array(z.string()),
  estados: z.array(z.string()),
});

interface Empresa {
  id: string;
  ordem: number;
  numero_contrato: string;
  nome: string;
  endereco: string;
  email: string;
  telefone: string;
  responsavel: string;
  chamadas_count: number;
  latitude?: string | null;
  longitude?: string | null;
}

interface EditarEmpresaFormProps {
  empresa: Empresa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditarEmpresaForm = ({ empresa, open, onOpenChange, onSuccess }: EditarEmpresaFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [servicos, setServicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [regioesMg, setRegioesMg] = useState<Array<{ id: string; nome: string }>>([]);
  const [estados, setEstados] = useState<Array<{ id: string; sigla: string; nome: string }>>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [regioesSelecionadas, setRegioesSelecionadas] = useState<string[]>([]);
  const [estadosSelecionados, setEstadosSelecionados] = useState<string[]>([]);

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
      chamadas_count: 0,
      servicos: [],
      regioes_mg: [],
      estados: [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) {
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
        
        setServicos(servicosRes.data && servicosRes.data.length > 0 ? servicosRes.data : defaultServicos);
        setRegioesMg(regioesRes.data && regioesRes.data.length > 0 ? regioesRes.data : defaultRegioesMG);
        setEstados(estadosRes.data && estadosRes.data.length > 0 ? estadosRes.data : defaultEstados);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setServicos(defaultServicos);
        setRegioesMg(defaultRegioesMG);
        setEstados(defaultEstados);
      }
    };
    loadData();
  }, []);

  // Carregar dados da empresa quando abrir o dialog
  useEffect(() => {
    if (empresa && open) {
      const loadEmpresaData = async () => {
        if (!supabase) return;

        try {
          // Carregar serviços da empresa
          const { data: servicosData } = await supabase
            .from("empresa_servicos")
            .select("servico_id")
            .eq("empresa_id", empresa.id);
          
          const servicosIds = (servicosData || []).map((s: any) => s.servico_id);
          setServicosSelecionados(servicosIds);

          // Carregar regiões
          const { data: regioesData } = await supabase
            .from("empresa_regioes_mg")
            .select("regiao_id")
            .eq("empresa_id", empresa.id);
          
          const regioesIds = (regioesData || []).map((r: any) => r.regiao_id);
          setRegioesSelecionadas(regioesIds);

          // Carregar estados
          const { data: estadosData } = await supabase
            .from("empresa_estados")
            .select("estado_id")
            .eq("empresa_id", empresa.id);
          
          const estadosIds = (estadosData || []).map((e: any) => e.estado_id);
          setEstadosSelecionados(estadosIds.length === 0 ? ["nenhum"] : estadosIds);

          // Preencher formulário
          form.reset({
            ordem: empresa.ordem,
            numero_contrato: empresa.numero_contrato,
            nome: empresa.nome,
            endereco: empresa.endereco,
            email: empresa.email,
            telefone: empresa.telefone,
            responsavel: empresa.responsavel,
            chamadas_count: empresa.chamadas_count,
            servicos: servicosIds,
            regioes_mg: regioesIds,
            estados: estadosIds.length === 0 ? ["nenhum"] : estadosIds,
          });
        } catch (error) {
          console.error("Erro ao carregar dados da empresa:", error);
          toast.error("Erro ao carregar dados da empresa");
        }
      };

      loadEmpresaData();
    }
  }, [empresa, open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!empresa || !supabase) return;

    setIsLoading(true);
    try {
      // Geocodificar endereço se mudou
      let coords = null;
      if (values.endereco !== empresa.endereco) {
        toast.info("Geocodificando novo endereço...");
        coords = await geocodeAddress(values.endereco);
        
        if (coords) {
          toast.success("Endereço localizado com sucesso!");
        } else {
          toast.warning("Não foi possível localizar o novo endereço. Mantendo coordenadas anteriores.");
        }
      } else if (empresa.latitude && empresa.longitude) {
        // Manter coordenadas existentes
        coords = {
          lat: parseFloat(empresa.latitude),
          lng: parseFloat(empresa.longitude),
        };
      }

      // Atualizar empresa
      const empresaDataToUpdate: any = {
        ordem: values.ordem,
        numero_contrato: values.numero_contrato,
        nome: values.nome,
        endereco: values.endereco,
        email: values.email,
        telefone: values.telefone,
        responsavel: values.responsavel,
        chamadas_count: values.chamadas_count || 0,
      };

      if (coords) {
        empresaDataToUpdate.latitude = coords.lat;
        empresaDataToUpdate.longitude = coords.lng;
      }

      const { error: empresaError } = await supabase
        .from("empresas")
        .update(empresaDataToUpdate)
        .eq("id", empresa.id);

      if (empresaError) throw empresaError;

      // Atualizar serviços
      await supabase.from("empresa_servicos").delete().eq("empresa_id", empresa.id);
      if (values.servicos.length > 0) {
        const servicosInserts = values.servicos.map((servicoId) => ({
          empresa_id: empresa.id,
          servico_id: servicoId,
        }));
        await supabase.from("empresa_servicos").insert(servicosInserts);
      }

      // Atualizar regiões
      await supabase.from("empresa_regioes_mg").delete().eq("empresa_id", empresa.id);
      if (values.regioes_mg.length > 0) {
        const regioesInserts = values.regioes_mg.map((regiaoId) => ({
          empresa_id: empresa.id,
          regiao_id: regiaoId,
        }));
        await supabase.from("empresa_regioes_mg").insert(regioesInserts);
      }

      // Atualizar estados
      await supabase.from("empresa_estados").delete().eq("empresa_id", empresa.id);
      const estadosParaInserir = values.estados.filter((estadoId) => estadoId !== "nenhum");
      if (estadosParaInserir.length > 0) {
        const estadosInserts = estadosParaInserir.map((estadoId) => ({
          empresa_id: empresa.id,
          estado_id: estadoId,
        }));
        await supabase.from("empresa_estados").insert(estadosInserts);
      }

      toast.success("Empresa atualizada com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao atualizar empresa:", error);
      if (error.code === "23505") {
        toast.error("Já existe uma empresa com esta ordem ou número de contrato");
      } else {
        toast.error("Erro ao atualizar empresa. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!empresa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Empresa</DialogTitle>
          <DialogDescription>
            Atualize as informações da empresa. O contador de chamadas continuará incrementando a partir do valor definido.
          </DialogDescription>
        </DialogHeader>

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

            <FormField
              control={form.control}
              name="chamadas_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Chamadas</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    💡 O contador continuará incrementando a partir deste valor quando novas chamadas forem registradas.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                                    field.onChange(["nenhum"]);
                                  } else {
                                    field.onChange([]);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer text-xs font-normal font-semibold">Nenhum</FormLabel>
                          </FormItem>
                        )}
                      />
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
                                      if (isNenhumSelected && checked) return;
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};



