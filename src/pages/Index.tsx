import { useState } from "react";
import { Link } from "react-router-dom";
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
  distanciaTexto?: string;
  tempo?: string;
  coordenadas?: {
    lat: number;
    lng: number;
  };
  servicos?: Array<{ id: string; nome: string }>;
}

const Index = () => {
  const [resultados, setResultados] = useState<EmpresaRankeada[]>([]);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [coordenadasOrigem, setCoordenadasOrigem] = useState<{ lat: number; lng: number } | undefined>();
  const [dadosBusca, setDadosBusca] = useState<{
    endereco: string;
    municipio: string;
    estado: string;
    servicos: string[];
  } | undefined>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-transform hover:scale-105">
                <Building2 className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Sistema de Vistorias</h1>
                <p className="text-sm text-muted-foreground">Encontre a empresa ideal para sua vistoria</p>
              </div>
            </div>
            <Button asChild variant="outline" className="gap-2 shadow-sm hover:shadow-md transition-all">
              <Link to="/admin">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Administração</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <Card className="border-2 border-primary/10 p-6 sm:p-8 shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm">
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Nova Solicitação de Vistoria</h2>
              <p className="text-sm text-muted-foreground">Preencha os dados da demanda para encontrar as empresas mais adequadas e próximas</p>
            </div>
            <BuscaVistoriaForm 
              onResultados={(empresas, coords, dados) => {
                setResultados(empresas);
                setCoordenadasOrigem(coords);
                setDadosBusca(dados);
                setBuscaRealizada(true);
              }}
            />
          </Card>

          {buscaRealizada && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ResultadosLista 
                empresas={resultados} 
                coordenadasOrigem={coordenadasOrigem}
                enderecoDemanda={dadosBusca?.endereco}
                municipio={dadosBusca?.municipio}
                estado={dadosBusca?.estado}
                servicosSolicitados={dadosBusca?.servicos}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
