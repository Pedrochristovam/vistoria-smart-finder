import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Mail, User, TrendingUp, CheckCircle2, MapPin, Clock, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EmpresaRankeada } from "@/pages/Index";
import { MapaRota } from "./MapaRota";
import { Coordinates } from "@/lib/geocoding";

interface ResultadosListaProps {
  empresas: EmpresaRankeada[];
  coordenadasOrigem?: Coordinates;
}

export const ResultadosLista = ({ empresas, coordenadasOrigem }: ResultadosListaProps) => {
  const [mapasVisiveis, setMapasVisiveis] = useState<Record<string, boolean>>({});

  const toggleMapa = (empresaId: string) => {
    setMapasVisiveis((prev) => ({
      ...prev,
      [empresaId]: !prev[empresaId],
    }));
  };

  const registrarChamada = async (empresa: EmpresaRankeada) => {
    if (!supabase) {
      toast.error("Supabase não configurado");
      return;
    }
    try {
      // Incrementar contador de chamadas
      const { error: updateError } = await supabase
        .from("empresas")
        .update({ chamadas_count: empresa.chamadas_count + 1 })
        .eq("id", empresa.id);

      if (updateError) throw updateError;

      toast.success(`Chamada registrada para ${empresa.nome}`);
    } catch (error) {
      console.error("Erro ao registrar chamada:", error);
      toast.error("Erro ao registrar chamada");
    }
  };

  if (empresas.length === 0) {
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

      <div className="space-y-4">
        {empresas.map((empresa, index) => {
          const podeMostrarMapa = coordenadasOrigem && empresa.coordenadas;
          const mostrarMapa = mapasVisiveis[empresa.id] || false;

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
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {empresa.endereco}
                      </p>
                    </div>
                  </div>

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

                <Button 
                  onClick={() => registrarChamada(empresa)} 
                  className="shrink-0 shadow-lg hover:shadow-xl transition-all w-full lg:w-auto"
                  size="lg"
                >
                  Selecionar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
