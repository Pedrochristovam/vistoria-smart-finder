import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Chamada {
  id: string;
  endereco_demanda: string;
  municipio: string | null;
  estado: string | null;
  servicos_solicitados: string[];
  created_at: string;
  empresas: {
    nome: string;
  };
}

export const HistoricoChamadas = () => {
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChamadas();
  }, []);

  const loadChamadas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("historico_chamadas")
        .select(`
          *,
          empresas(nome)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setChamadas(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de chamadas");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chamadas.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Nenhuma chamada registrada ainda.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Endereço</TableHead>
            <TableHead>Município</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Serviços</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chamadas.map((chamada) => (
            <TableRow key={chamada.id}>
              <TableCell className="text-sm">
                {format(new Date(chamada.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell className="font-medium">{chamada.empresas?.nome}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{chamada.endereco_demanda}</TableCell>
              <TableCell>{chamada.municipio || "-"}</TableCell>
              <TableCell>
                <Badge variant="outline">{chamada.estado || "-"}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{chamada.servicos_solicitados.length} serviço(s)</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
