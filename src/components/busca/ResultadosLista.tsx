import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Mail, User, TrendingUp, CheckCircle2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EmpresaRankeada } from "@/pages/Index";
import { formatDistance } from "@/lib/geocoding";

interface ResultadosListaProps {
  empresas: EmpresaRankeada[];
}

export const ResultadosLista = ({ empresas }: ResultadosListaProps) => {
  const registrarChamada = async (empresa: EmpresaRankeada) => {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Empresas Recomendadas ({empresas.length})
        </h3>
        <Badge variant="secondary" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          Ordenado por relevância
        </Badge>
      </div>

      <div className="space-y-4">
        {empresas.map((empresa, index) => (
          <Card key={empresa.id} className="group p-6 transition-all hover:shadow-lg hover:border-primary/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-foreground">{empresa.nome}</h4>
                      {index === 0 && (
                        <Badge className="gap-1 bg-success text-success-foreground shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          Melhor opção
                        </Badge>
                      )}
                      {empresa.distancia !== undefined && (
                        <Badge variant="secondary" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatDistance(empresa.distancia)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{empresa.endereco}</p>
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-md bg-secondary/30 px-3 py-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{empresa.email}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-secondary/30 px-3 py-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{empresa.telefone}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-secondary/30 px-3 py-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate">{empresa.responsavel}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-primary">Justificativa:</span> {empresa.motivo}
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => registrarChamada(empresa)} 
                className="shrink-0 shadow-sm hover:shadow-md transition-shadow"
                size="lg"
              >
                Selecionar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
