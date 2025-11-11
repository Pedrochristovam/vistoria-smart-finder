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
import { Loader2, X } from "lucide-react";

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
  estados: z.array(z.string()).min(1, "Selecione pelo menos um estado"),
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
      const [servicosRes, regioesRes, estadosRes] = await Promise.all([
        supabase.from("servicos").select("*").order("ordem"),
        supabase.from("regioes_mg").select("*").order("nome"),
        supabase.from("estados").select("*").order("sigla"),
      ]);
      
      if (servicosRes.data) setServicos(servicosRes.data);
      if (regioesRes.data) setRegioesMg(regioesRes.data);
      if (estadosRes.data) setEstados(estadosRes.data);
    };
    loadData();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Inserir empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .insert([
          {
            ordem: values.ordem,
            numero_contrato: values.numero_contrato,
            nome: values.nome,
            endereco: values.endereco,
            email: values.email,
            telefone: values.telefone,
            responsavel: values.responsavel,
            chamadas_count: 0,
          },
        ])
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

      // Inserir relações de estados
      const estadosInserts = values.estados.map((estadoId) => ({
        empresa_id: empresaData.id,
        estado_id: estadoId,
      }));
      
      const { error: estadosError } = await supabase
        .from("empresa_estados")
        .insert(estadosInserts);
      
      if (estadosError) throw estadosError;

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
                <FormLabel>Endereço Completo</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
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
                    {estados.map((estado) => (
                      <FormField
                        key={estado.id}
                        control={form.control}
                        name="estados"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 hover:bg-secondary/50">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(estado.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, estado.id])
                                    : field.onChange(field.value?.filter((value) => value !== estado.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer text-xs font-normal">{estado.sigla}</FormLabel>
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
