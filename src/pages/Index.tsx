import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Settings } from "lucide-react";
import { BuscaVistoriaForm } from "@/components/busca/BuscaVistoriaForm";
import { ResultadosLista } from "@/components/busca/ResultadosLista";

export interface EmpresaRankeada {
  id: string;
  nome: string;
  endereco: string;
  email: string;
  telefone: string;
  responsavel: string;
  chamadas_count: number;
  score: number;
  motivo: string;
  distancia?: number;
}

const Index = () => {
  const [resultados, setResultados] = useState<EmpresaRankeada[]>([]);
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sistema de Vistorias</h1>
                <p className="text-sm text-muted-foreground">Encontre a empresa ideal para sua vistoria</p>
              </div>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <a href="/admin">
                <Settings className="h-4 w-4" />
                Administração
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <Card className="border-2 p-8 shadow-lg">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Nova Solicitação de Vistoria</h2>
              <p className="text-sm text-muted-foreground">Preencha os dados da demanda para encontrar as empresas mais adequadas</p>
            </div>
            <BuscaVistoriaForm 
              onResultados={(empresas) => {
                setResultados(empresas);
                setBuscaRealizada(true);
              }}
            />
          </Card>

          {buscaRealizada && (
            <ResultadosLista empresas={resultados} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
