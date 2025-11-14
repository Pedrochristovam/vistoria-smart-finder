import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Phone, Mail, User, TrendingUp, CheckCircle2, MapPin, Clock, Navigation, CheckSquare, Square, Wrench, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EmpresaRankeada } from "@/pages/Index";
import { MapaRota } from "./MapaRota";
import { Coordinates } from "@/lib/geocoding";

interface ResultadosListaProps {
  empresas: EmpresaRankeada[];
  coordenadasOrigem?: Coordinates;
  enderecoDemanda?: string;
  municipio?: string;
  estado?: string;
  servicosSolicitados?: string[];
}

interface DemandaStandby {
  id: string;
  endereco: string;
  municipio?: string;
  estado?: string;
  servicosSolicitados: string[]; // IDs
  servicosNomes?: string[]; // Nomes dos serviços
  empresas: EmpresaRankeada[];
  coordenadasOrigem?: Coordinates;
  dataCriacao: string;
}

const STORAGE_KEY = "vistoria_standby_demandas";

export const ResultadosLista = ({ 
  empresas, 
  coordenadasOrigem,
  enderecoDemanda,
  municipio,
  estado,
  servicosSolicitados = []
}: ResultadosListaProps) => {
  const [mapasVisiveis, setMapasVisiveis] = useState<Record<string, boolean>>({});
  const [empresasStandby, setEmpresasStandby] = useState<Set<string>>(new Set());
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [demandasStandby, setDemandasStandby] = useState<DemandaStandby[]>([]);

  // Carregar demandas em standby do localStorage
  useEffect(() => {
    const carregarStandby = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const demandas = JSON.parse(stored) as DemandaStandby[];
          setDemandasStandby(demandas);
        }
      } catch (error) {
        console.error("Erro ao carregar standby:", error);
      }
    };
    carregarStandby();
  }, []);

  // Salvar demandas em standby no localStorage
  const salvarStandbyStorage = (demandas: DemandaStandby[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demandas));
      setDemandasStandby(demandas);
    } catch (error) {
      console.error("Erro ao salvar standby:", error);
      toast.error("Erro ao salvar standby");
    }
  };

  const toggleMapa = (empresaId: string) => {
    setMapasVisiveis((prev) => ({
      ...prev,
      [empresaId]: !prev[empresaId],
    }));
  };

  const toggleStandby = (empresaId: string) => {
    setEmpresasStandby((prev) => {
      const novo = new Set(prev);
      if (novo.has(empresaId)) {
        novo.delete(empresaId);
      } else {
        novo.add(empresaId);
      }
      return novo;
    });
  };

  // Salvar demanda atual em standby
  const salvarDemandaStandby = async () => {
    if (!enderecoDemanda || empresasStandby.size === 0) {
      toast.error("Adicione pelo menos uma empresa ao standby antes de salvar");
      return;
    }

    const empresasSelecionadas = empresas.filter(e => empresasStandby.has(e.id));
    
    // Buscar nomes dos serviços
    let servicosNomes: string[] = [];
    if (servicosSolicitados && servicosSolicitados.length > 0 && supabase) {
      try {
        const { data: servicosData } = await supabase
          .from("servicos")
          .select("id, nome")
          .in("id", servicosSolicitados);
        servicosNomes = (servicosData || []).map(s => s.nome);
      } catch (error) {
        console.error("Erro ao buscar nomes dos serviços:", error);
      }
    }
    
    // Criar ID único baseado no endereço e serviços
    const demandaId = `${enderecoDemanda}_${servicosSolicitados?.join(",")}_${Date.now()}`;
    
    const novaDemanda: DemandaStandby = {
      id: demandaId,
      endereco: enderecoDemanda,
      municipio,
      estado,
      servicosSolicitados: servicosSolicitados || [],
      servicosNomes,
      empresas: empresasSelecionadas,
      coordenadasOrigem,
      dataCriacao: new Date().toISOString(),
    };

    const novasDemandas = [...demandasStandby, novaDemanda];
    salvarStandbyStorage(novasDemandas);
    
    // Limpar standby atual
    setEmpresasStandby(new Set());
    toast.success("Demanda salva em standby! Você pode continuar pesquisando.");
  };

  // Remover demanda do standby
  const removerDemandaStandby = (demandaId: string) => {
    const novasDemandas = demandasStandby.filter(d => d.id !== demandaId);
    salvarStandbyStorage(novasDemandas);
    toast.success("Demanda removida do standby");
  };

  const salvarHistorico = async (empresaId: string, demanda?: DemandaStandby) => {
    if (!supabase) {
      toast.error("Supabase não configurado");
      return;
    }

    const endereco = demanda?.endereco || enderecoDemanda;
    const municipioFinal = demanda?.municipio || municipio;
    const estadoFinal = demanda?.estado || estado;
    const servicos = demanda?.servicosSolicitados || servicosSolicitados || [];

    if (!endereco || servicos.length === 0) {
      toast.error("Dados da demanda não disponíveis");
      return;
    }

    try {
      // Buscar nomes dos serviços solicitados
      const { data: servicosData } = await supabase
        .from("servicos")
        .select("id, nome")
        .in("id", servicos);

      const nomesServicos = (servicosData || []).map(s => s.nome);

      // Salvar no histórico
      const { error: historicoError } = await supabase
        .from("historico_chamadas")
        .insert({
          empresa_id: empresaId,
          endereco_demanda: endereco,
          municipio: municipioFinal || null,
          estado: estadoFinal || null,
          servicos_solicitados: nomesServicos,
        });

      if (historicoError) throw historicoError;

      // Incrementar contador de chamadas
      const empresa = demanda?.empresas.find(e => e.id === empresaId) || empresas.find(e => e.id === empresaId);
      if (empresa) {
        const { error: updateError } = await supabase
          .from("empresas")
          .update({ chamadas_count: empresa.chamadas_count + 1 })
          .eq("id", empresaId);

        if (updateError) throw updateError;
      }

      toast.success(`Empresa ${empresa?.nome} selecionada e salva no histórico`);
      
      // Se veio de uma demanda em standby, remover ela
      if (demanda) {
        removerDemandaStandby(demanda.id);
      } else {
        setDialogAberto(false);
        setEmpresaSelecionada(null);
        setEmpresasStandby(new Set());
      }
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
      toast.error("Erro ao salvar no histórico");
    }
  };

  const selecionarEmpresaFinal = (empresaId: string, demanda?: DemandaStandby) => {
    setEmpresaSelecionada(empresaId);
    setDialogAberto(true);
  };

  const confirmarSelecao = (demanda?: DemandaStandby) => {
    if (empresaSelecionada) {
      salvarHistorico(empresaSelecionada, demanda);
    }
  };

  const empresasStandbyList = empresas.filter(e => empresasStandby.has(e.id));
  const totalStandby = demandasStandby.reduce((acc, d) => acc + d.empresas.length, 0) + empresasStandby.size;

  if (empresas.length === 0 && demandasStandby.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Nenhum resultado encontrado. Ajuste os critérios de busca.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground tracking-tight">
            Empresas Recomendadas
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {empresas.length} {empresas.length === 1 ? "empresa encontrada" : "empresas encontradas"} ordenadas por proximidade
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Ordenado por relevância
        </Badge>
      </div>

      <Tabs defaultValue="resultados" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resultados">
            Resultados ({empresas.length})
          </TabsTrigger>
          <TabsTrigger value="standby">
            Standby ({totalStandby})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resultados" className="space-y-4 mt-6">
          {empresas.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum resultado encontrado. Ajuste os critérios de busca.</p>
            </Card>
          ) : (
            <>
              {empresasStandby.size > 0 && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {empresasStandby.size} {empresasStandby.size === 1 ? "empresa" : "empresas"} selecionada(s) para esta demanda
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Salve em standby para continuar pesquisando outras demandas
                      </p>
                    </div>
                    <Button 
                      onClick={salvarDemandaStandby}
                      className="gap-2"
                      size="sm"
                    >
                      <Save className="h-4 w-4" />
                      Salvar em Standby
                    </Button>
                  </div>
                </Card>
              )}

              {empresas.map((empresa, index) => {
                const podeMostrarMapa = coordenadasOrigem && empresa.coordenadas;
                const mostrarMapa = mapasVisiveis[empresa.id] || false;
                const estaNoStandby = empresasStandby.has(empresa.id);

                return (
                  <Card 
                    key={empresa.id} 
                    className="group p-6 transition-all hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 border-2 bg-card/80 backdrop-blur-sm"
                  >
                    <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                      <div className="flex-1 space-y-4 w-full">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-all group-hover:bg-primary/20 group-hover:scale-110 shadow-sm">
                            <Building2 className="h-7 w-7 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="text-xl font-bold text-foreground">{empresa.nome}</h4>
                              {index === 0 && (
                                <Badge className="gap-1.5 bg-success text-success-foreground shadow-md px-2.5 py-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Melhor opção
                                </Badge>
                              )}
                              {empresa.distanciaTexto && (
                                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                                  <MapPin className="h-3.5 w-3.5 text-primary" />
                                  {empresa.distanciaTexto}
                                </Badge>
                              )}
                              {empresa.tempo && empresa.tempo !== "N/A" && (
                                <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
                                  <Clock className="h-3.5 w-3.5 text-primary" />
                                  {empresa.tempo}
                                </Badge>
                              )}
                              {empresa.chamadas_count !== undefined && (
                                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                  {empresa.chamadas_count} {empresa.chamadas_count === 1 ? "chamada" : "chamadas"}
                                </Badge>
                              )}
                              {estaNoStandby && (
                                <Badge variant="default" className="gap-1.5 px-2.5 py-1">
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  Em Standby
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {empresa.endereco}
                            </p>
                          </div>
                        </div>

                        {/* Serviços da empresa */}
                        {empresa.servicos && empresa.servicos.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <Wrench className="h-4 w-4 text-primary" />
                              Serviços Realizados:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {empresa.servicos.map((servico) => (
                                <Badge key={servico.id} variant="outline" className="text-xs">
                                  {servico.nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid gap-3 text-sm md:grid-cols-3">
                          <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-4 py-3 text-muted-foreground border border-secondary/50 hover:bg-secondary/60 transition-colors">
                            <Mail className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate">{empresa.email}</span>
                          </div>
                          <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-4 py-3 text-muted-foreground border border-secondary/50 hover:bg-secondary/60 transition-colors">
                            <Phone className="h-4 w-4 shrink-0 text-primary" />
                            <span>{empresa.telefone}</span>
                          </div>
                          <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-4 py-3 text-muted-foreground border border-secondary/50 hover:bg-secondary/60 transition-colors">
                            <User className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate">{empresa.responsavel}</span>
                          </div>
                        </div>

                        {podeMostrarMapa && (
                          <div className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleMapa(empresa.id)}
                              className="gap-2"
                            >
                              <Navigation className="h-4 w-4" />
                              {mostrarMapa ? "Ocultar" : "Ver"} Rota no Mapa
                            </Button>
                            {mostrarMapa && (
                              <MapaRota
                                origem={coordenadasOrigem!}
                                destino={empresa.coordenadas!}
                                nomeEmpresa={empresa.nome}
                                enderecoEmpresa={empresa.endereco}
                                className="h-80 w-full rounded-lg border-2"
                              />
                            )}
                          </div>
                        )}

                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                          <p className="text-sm text-foreground leading-relaxed">
                            <span className="font-semibold text-primary">Justificativa:</span> {empresa.motivo}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0 w-full lg:w-auto">
                        <Button 
                          onClick={() => toggleStandby(empresa.id)} 
                          variant={estaNoStandby ? "default" : "outline"}
                          className="shadow-lg hover:shadow-xl transition-all w-full"
                          size="lg"
                        >
                          {estaNoStandby ? (
                            <>
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Remover do Standby
                            </>
                          ) : (
                            <>
                              <Square className="h-4 w-4 mr-2" />
                              Adicionar ao Standby
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => salvarHistorico(empresa.id)} 
                          className="shadow-lg hover:shadow-xl transition-all w-full"
                          size="lg"
                        >
                          Selecionar Direto
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        <TabsContent value="standby" className="space-y-4 mt-6">
          {/* Demandas salvas em standby */}
          {demandasStandby.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Demandas Salvas em Standby</h4>
                <Badge variant="secondary">{demandasStandby.length} demanda(s)</Badge>
              </div>
              
              {demandasStandby.map((demanda) => {
                const quantidadeEmpresas = demanda.empresas.length;
                const corEndereco = quantidadeEmpresas > 1 ? "text-red-600 font-semibold" : "text-yellow-600 font-semibold";
                const corBorda = quantidadeEmpresas > 1 ? "border-red-300 bg-red-50/50" : "border-yellow-300 bg-yellow-50/50";

                return (
                  <Card key={demanda.id} className={`p-6 border-2 ${corBorda}`}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <p className={`text-base ${corEndereco}`}>
                              {demanda.endereco}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {demanda.municipio && (
                              <Badge variant="outline">{demanda.municipio}</Badge>
                            )}
                            {demanda.estado && (
                              <Badge variant="outline">{demanda.estado}</Badge>
                            )}
                            <Badge variant="secondary">
                              {quantidadeEmpresas} {quantidadeEmpresas === 1 ? "empresa" : "empresas"}
                            </Badge>
                          </div>
                          {demanda.servicosSolicitados.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {demanda.servicosNomes && demanda.servicosNomes.length > 0 ? (
                                demanda.servicosNomes.map((nome, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {nome}
                                  </Badge>
                                ))
                              ) : (
                                demanda.servicosSolicitados.map((servicoId, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    Serviço {idx + 1}
                                  </Badge>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerDemandaStandby(demanda.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {demanda.empresas.map((empresa) => (
                          <Card key={empresa.id} className="p-4 border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-foreground">{empresa.nome}</h5>
                                <p className="text-sm text-muted-foreground">{empresa.endereco}</p>
                                {empresa.distanciaTexto && (
                                  <Badge variant="secondary" className="mt-2">
                                    {empresa.distanciaTexto}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja escolher ${empresa.nome} para esta demanda?`)) {
                                    salvarHistorico(empresa.id, demanda);
                                  }
                                }}
                                size="sm"
                              >
                                Escolher
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Standby atual (não salvo ainda) */}
          {empresasStandbyList.length > 0 && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Standby Atual (não salvo)</h4>
                <Button 
                  onClick={salvarDemandaStandby}
                  className="gap-2"
                  size="sm"
                >
                  <Save className="h-4 w-4" />
                  Salvar em Standby
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {empresasStandbyList.length} {empresasStandbyList.length === 1 ? "empresa selecionada" : "empresas selecionadas"} para escolha final
                </p>
                <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default"
                      size="lg"
                      disabled={empresasStandbyList.length === 0}
                    >
                      Escolher Empresa Final
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Escolher Empresa Final</DialogTitle>
                      <DialogDescription>
                        Selecione a empresa que será escolhida entre as empresas em standby
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 mt-4">
                      {empresasStandbyList.map((empresa) => (
                        <Card 
                          key={empresa.id}
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            empresaSelecionada === empresa.id 
                              ? "border-primary border-2 bg-primary/5" 
                              : "border"
                          }`}
                          onClick={() => setEmpresaSelecionada(empresa.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              empresaSelecionada === empresa.id 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-secondary"
                            }`}>
                              {empresaSelecionada === empresa.id ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Building2 className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">{empresa.nome}</h4>
                              <p className="text-sm text-muted-foreground">{empresa.endereco}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {empresa.distanciaTexto && (
                                  <Badge variant="secondary">
                                    {empresa.distanciaTexto}
                                  </Badge>
                                )}
                                {empresa.chamadas_count !== undefined && (
                                  <Badge variant="outline" className="gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {empresa.chamadas_count} {empresa.chamadas_count === 1 ? "chamada" : "chamadas"}
                                  </Badge>
                                )}
                              </div>
                              {empresa.servicos && empresa.servicos.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {empresa.servicos.map((s) => (
                                    <Badge key={s.id} variant="outline" className="text-xs">
                                      {s.nome}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button variant="outline" onClick={() => setDialogAberto(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={() => {
                          if (empresaSelecionada) {
                            salvarHistorico(empresaSelecionada);
                          }
                        }}
                        disabled={!empresaSelecionada}
                      >
                        Confirmar Seleção
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {empresasStandbyList.map((empresa) => {
                  const podeMostrarMapa = coordenadasOrigem && empresa.coordenadas;
                  const mostrarMapa = mapasVisiveis[empresa.id] || false;

                  return (
                    <Card 
                      key={empresa.id} 
                      className="group p-6 transition-all hover:shadow-xl hover:border-primary/30 border-2 bg-card/80 backdrop-blur-sm"
                    >
                      <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                        <div className="flex-1 space-y-4 w-full">
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-all group-hover:bg-primary/20 group-hover:scale-110 shadow-sm">
                              <Building2 className="h-7 w-7 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h4 className="text-xl font-bold text-foreground">{empresa.nome}</h4>
                                {empresa.distanciaTexto && (
                                  <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    {empresa.distanciaTexto}
                                  </Badge>
                                )}
                                {empresa.tempo && empresa.tempo !== "N/A" && (
                                  <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    {empresa.tempo}
                                  </Badge>
                                )}
                                {empresa.chamadas_count !== undefined && (
                                  <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                    {empresa.chamadas_count} {empresa.chamadas_count === 1 ? "chamada" : "chamadas"}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {empresa.endereco}
                              </p>
                            </div>
                          </div>

                          {/* Serviços da empresa */}
                          {empresa.servicos && empresa.servicos.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Wrench className="h-4 w-4 text-primary" />
                                Serviços Realizados:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {empresa.servicos.map((servico) => (
                                  <Badge key={servico.id} variant="outline" className="text-xs">
                                    {servico.nome}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid gap-3 text-sm md:grid-cols-3">
                            <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-4 py-3 text-muted-foreground border border-secondary/50 hover:bg-secondary/60 transition-colors">
                              <Mail className="h-4 w-4 shrink-0 text-primary" />
                              <span className="truncate">{empresa.email}</span>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-4 py-3 text-muted-foreground border border-secondary/50 hover:bg-secondary/60 transition-colors">
                              <Phone className="h-4 w-4 shrink-0 text-primary" />
                              <span>{empresa.telefone}</span>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-4 py-3 text-muted-foreground border border-secondary/50 hover:bg-secondary/60 transition-colors">
                              <User className="h-4 w-4 shrink-0 text-primary" />
                              <span className="truncate">{empresa.responsavel}</span>
                            </div>
                          </div>

                          {podeMostrarMapa && (
                            <div className="space-y-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleMapa(empresa.id)}
                                className="gap-2"
                              >
                                <Navigation className="h-4 w-4" />
                                {mostrarMapa ? "Ocultar" : "Ver"} Rota no Mapa
                              </Button>
                              {mostrarMapa && (
                                <MapaRota
                                  origem={coordenadasOrigem!}
                                  destino={empresa.coordenadas!}
                                  nomeEmpresa={empresa.nome}
                                  enderecoEmpresa={empresa.endereco}
                                  className="h-80 w-full rounded-lg border-2"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0 w-full lg:w-auto">
                          <Button 
                            onClick={() => toggleStandby(empresa.id)} 
                            variant="outline"
                            className="shadow-lg hover:shadow-xl transition-all w-full"
                            size="lg"
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Remover do Standby
                          </Button>
                          <Button 
                            onClick={() => selecionarEmpresaFinal(empresa.id)} 
                            className="shadow-lg hover:shadow-xl transition-all w-full"
                            size="lg"
                          >
                            Escolher Esta
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {demandasStandby.length === 0 && empresasStandbyList.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhuma demanda em standby. Adicione empresas do resultado ao standby e salve.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
