import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";

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
  const [error, setError] = useState<string | null>(null);

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
        .limit(1000); // Aumentar limite para permitir mais dados

      if (error) throw error;
      setChamadas(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de chamadas");
    } finally {
      setIsLoading(false);
    }
  };


  const gerarPDF = () => {
    const dadosParaPDF = chamadas;
    
    if (dadosParaPDF.length === 0) {
      toast.error("Nenhum dado para gerar PDF");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      let yPos = 20;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const lineHeight = 7;

      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Histórico de Chamadas - Empresas Contratadas", margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total de registros: ${dadosParaPDF.length}`, margin, yPos);
      yPos += 8;

      // Cabeçalho da tabela
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const colWidths = [20, 50, 60, 25, 20, 50];
      const headers = ["Data", "Empresa", "Endereço", "Município", "Estado", "Serviços"];
      
      let xPos = margin;
      headers.forEach((header, index) => {
        doc.text(header, xPos, yPos);
        xPos += colWidths[index];
      });
      yPos += 5;

      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3;

      // Dados
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      dadosParaPDF.forEach((chamada, index) => {
        // Verificar se precisa de nova página
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
          
          // Reimprimir cabeçalho
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          xPos = margin;
          headers.forEach((header, idx) => {
            doc.text(header, xPos, yPos);
            xPos += colWidths[idx];
          });
          yPos += 5;
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 3;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
        }

        const dataFormatada = format(new Date(chamada.created_at), "dd/MM/yyyy", { locale: ptBR });
        const empresaNome = chamada.empresas?.nome || "N/A";
        const endereco = chamada.endereco_demanda.length > 50 
          ? chamada.endereco_demanda.substring(0, 47) + "..." 
          : chamada.endereco_demanda;
        const municipio = chamada.municipio || "-";
        const estado = chamada.estado || "-";
        const servicosTexto = chamada.servicos_solicitados.length > 0
          ? chamada.servicos_solicitados.join(", ").substring(0, 45) + (chamada.servicos_solicitados.join(", ").length > 45 ? "..." : "")
          : "-";

        xPos = margin;
        const valores = [dataFormatada, empresaNome, endereco, municipio, estado, servicosTexto];
        
        valores.forEach((valor, idx) => {
          // Quebrar texto longo em múltiplas linhas
          const maxWidth = colWidths[idx] - 2;
          const lines = doc.splitTextToSize(valor, maxWidth);
          
          lines.forEach((line: string, lineIdx: number) => {
            if (lineIdx === 0) {
              doc.text(line, xPos, yPos);
            } else {
              doc.text(line, xPos, yPos + (lineIdx * 4));
            }
          });
          
          xPos += colWidths[idx];
        });

        // Ajustar yPos baseado na linha mais alta
        const maxLines = Math.max(...valores.map((v, idx) => {
          const maxWidth = colWidths[idx] - 2;
          return doc.splitTextToSize(v, maxWidth).length;
        }));
        
        yPos += (maxLines * 4) + 2;

        // Linha separadora entre registros
        if (index < dadosParaPDF.length - 1) {
          doc.setLineWidth(0.1);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 2;
        }
      });

      // Rodapé
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${totalPages} - Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
          margin,
          pageHeight - 10
        );
      }

      // Salvar PDF
      const nomeArquivo = `historico_chamadas_${format(new Date(), "yyyy-MM-dd", { locale: ptBR })}.pdf`;
      doc.save(nomeArquivo);
      
      toast.success(`PDF gerado com ${dadosParaPDF.length} registro(s)!`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dadosExibidos = chamadas;

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => {
          setError(null);
          loadChamadas();
        }}>
          Tentar Novamente
        </Button>
      </div>
    );
  }

  try {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Histórico de Chamadas</h3>
            <p className="text-sm text-muted-foreground">
              {dadosExibidos.length} {dadosExibidos.length === 1 ? "registro encontrado" : "registros encontrados"}
            </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={gerarPDF}
                className="gap-2"
                disabled={dadosExibidos.length === 0}
              >
                <FileDown className="h-4 w-4" />
                Gerar PDF
              </Button>
            </div>
          </div>
      </Card>

      {dadosExibidos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          Nenhuma chamada registrada ainda.
        </div>
      ) : (
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
              {dadosExibidos.map((chamada) => (
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
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {chamada.servicos_solicitados.length > 0 ? (
                        chamada.servicos_solicitados.map((servico, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {servico}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      </div>
    );
  } catch (renderError) {
    console.error("Erro ao renderizar componente:", renderError);
    return (
      <div className="py-12 text-center">
        <p className="text-destructive mb-4">Erro ao renderizar histórico. Recarregue a página.</p>
        <Button onClick={() => window.location.reload()}>
          Recarregar Página
        </Button>
      </div>
    );
  }
};
