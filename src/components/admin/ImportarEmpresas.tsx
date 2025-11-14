import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocoding";

interface EmpresaImportada {
  nome: string;
  endereco: string;
  email?: string;
  telefone?: string;
  responsavel?: string;
  numero_contrato?: string;
  linhaOriginal: string;
  linhaNumero: number;
}

interface ImportarEmpresasProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ImportarEmpresas = ({ onSuccess, onCancel }: ImportarEmpresasProps) => {
  const [textoImportacao, setTextoImportacao] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [empresasParseadas, setEmpresasParseadas] = useState<EmpresaImportada[]>([]);
  const [resultadoImportacao, setResultadoImportacao] = useState<{
    sucesso: number;
    erros: Array<{ linha: number; erro: string }>;
  } | null>(null);

  // Parse do texto para extrair empresas
  const parsearEmpresas = (texto: string): EmpresaImportada[] => {
    // Manter linhas vazias para preservar estrutura, mas remover espaços extras
    const linhas = texto.split("\n").map(l => l.trim());
    const empresas: EmpresaImportada[] = [];
    let i = 0;

    while (i < linhas.length) {
      const linhaAtual = linhas[i];
      
      // Pular linhas vazias
      if (!linhaAtual) {
        i++;
        continue;
      }

      // Verificar se a linha atual começa com "Rua" - se sim, é endereço (pular, pois já processamos o nome antes)
      if (linhaAtual.toLowerCase().startsWith("rua ")) {
        i++;
        continue;
      }

      // Verificar se a próxima linha (não vazia) começa com "Rua" - formato: Nome, depois Rua...
      let proximaLinha = "";
      let proximoIndice = i + 1;
      while (proximoIndice < linhas.length && !proximaLinha) {
        if (linhas[proximoIndice]) {
          proximaLinha = linhas[proximoIndice];
          break;
        }
        proximoIndice++;
      }

      let linhaDepois = "";
      let depoisIndice = proximoIndice + 1;
      while (depoisIndice < linhas.length && !linhaDepois) {
        if (linhas[depoisIndice]) {
          linhaDepois = linhas[depoisIndice];
          break;
        }
        depoisIndice++;
      }
      
      let nome = "";
      let endereco = "";
      let email = "";
      let telefone = "";
      let responsavel = "";
      let numero_contrato = "";

      // Formato padrão: Nome na linha atual, Endereço na próxima (começa com "Rua")
      if (proximaLinha.toLowerCase().startsWith("rua ")) {
        nome = linhaAtual;
        endereco = proximaLinha;
        
        // Remover vírgula final se houver
        if (endereco.endsWith(",")) {
          endereco = endereco.slice(0, -1).trim();
        }
        
        // Se tem uma terceira linha, pode ser cidade/estado/CEP - adicionar ao endereço
        if (linhaDepois && (linhaDepois.includes("/") || linhaDepois.toLowerCase().includes("cep"))) {
          endereco += `, ${linhaDepois}`;
          i = depoisIndice + 1; // Pular até depois da terceira linha
        } else {
          i = proximoIndice + 1; // Pular até depois da segunda linha
        }
      }
      // Formato alternativo: Nome | Endereço na mesma linha
      else if (linhaAtual.includes("|")) {
        const partes = linhaAtual.split("|").map(p => p.trim());
        nome = partes[0] || "";
        endereco = partes.slice(1).join(", ") || "";
        i++;
      }
      // Formato alternativo: Nome - Endereço na mesma linha
      else if (linhaAtual.includes(" - ")) {
        const partes = linhaAtual.split(" - ").map(p => p.trim());
        nome = partes[0] || "";
        endereco = partes.slice(1).join(" - ") || "";
        i++;
      }
      // Formato alternativo: Nome, Endereço (separado por vírgula e contém "Rua")
      else if (linhaAtual.includes(",") && linhaAtual.toLowerCase().includes("rua")) {
        // Se a linha atual já contém "Rua", pode ser nome e endereço juntos
        const primeiraVirgula = linhaAtual.indexOf(",");
        nome = linhaAtual.substring(0, primeiraVirgula).trim();
        endereco = linhaAtual.substring(primeiraVirgula + 1).trim();
        i++;
      }
      // Se não tem endereço na próxima linha, assumir que é só o nome
      else {
        nome = linhaAtual;
        endereco = ""; // Sem endereço, será preenchido depois
        i++;
      }

      // Validar se tem pelo menos nome
      if (nome.length >= 3) {
        empresas.push({
          nome,
          endereco: endereco || nome, // Se não tem endereço, usar nome como fallback temporário
          email,
          telefone,
          responsavel,
          numero_contrato,
          linhaOriginal: linhaAtual,
          linhaNumero: i,
        });
      } else {
        i++; // Se não é válido, avançar uma linha
      }
    }

    return empresas;
  };

  const processarTexto = () => {
    if (!textoImportacao.trim()) {
      toast.error("Cole a lista de empresas");
      return;
    }

    const empresas = parsearEmpresas(textoImportacao);
    
    if (empresas.length === 0) {
      toast.error("Nenhuma empresa válida encontrada no texto");
      return;
    }

    setEmpresasParseadas(empresas);
    toast.success(`${empresas.length} empresa(s) encontrada(s) no texto`);
  };

  const importarEmpresas = async () => {
    if (empresasParseadas.length === 0) {
      toast.error("Nenhuma empresa para importar");
      return;
    }

    if (!supabase) {
      toast.error("Supabase não configurado");
      return;
    }

    setIsLoading(true);
    const erros: Array<{ linha: number; erro: string }> = [];
    let sucesso = 0;

    try {
      // Buscar a maior ordem atual para continuar a numeração
      const { data: empresasExistentes } = await supabase
        .from("empresas")
        .select("ordem")
        .order("ordem", { ascending: false })
        .limit(1);

      let proximaOrdem = empresasExistentes && empresasExistentes.length > 0 
        ? empresasExistentes[0].ordem + 1 
        : 1;

      // Importar empresas uma por uma
      for (const empresa of empresasParseadas) {
        try {
          // Geocodificar endereço (opcional, não bloquear se falhar)
          let coords = null;
          if (empresa.endereco && empresa.endereco !== empresa.nome) {
            try {
              coords = await geocodeAddress(empresa.endereco);
            } catch (error) {
              console.warn(`Não foi possível geocodificar ${empresa.nome}:`, error);
            }
          }

          // Criar dados da empresa
          const empresaData: any = {
            ordem: proximaOrdem++,
            numero_contrato: empresa.numero_contrato || `CONTRATO-${proximaOrdem - 1}`,
            nome: empresa.nome,
            endereco: empresa.endereco || empresa.nome,
            email: empresa.email || `contato@${empresa.nome.toLowerCase().replace(/\s+/g, "")}.com`,
            telefone: empresa.telefone || "(00) 00000-0000",
            responsavel: empresa.responsavel || "A definir",
            chamadas_count: 0,
          };

          if (coords) {
            empresaData.latitude = coords.lat;
            empresaData.longitude = coords.lng;
          }

          const { data: empresaCriada, error: empresaError } = await supabase
            .from("empresas")
            .insert([empresaData])
            .select()
            .single();

          if (empresaError) {
            if (empresaError.code === "23505") {
              erros.push({
                linha: empresa.linhaNumero,
                erro: `Já existe empresa com esta ordem ou contrato`
              });
            } else {
              erros.push({
                linha: empresa.linhaNumero,
                erro: empresaError.message
              });
            }
            continue;
          }

          sucesso++;
        } catch (error: any) {
          erros.push({
            linha: empresa.linhaNumero,
            erro: error.message || "Erro desconhecido"
          });
        }
      }

      setResultadoImportacao({ sucesso, erros });
      
      if (sucesso > 0) {
        toast.success(`${sucesso} empresa(s) importada(s) com sucesso!`);
        if (erros.length > 0) {
          toast.warning(`${erros.length} empresa(s) tiveram erro. Verifique os detalhes.`);
        }
      } else {
        toast.error("Nenhuma empresa foi importada. Verifique os erros.");
      }
    } catch (error) {
      console.error("Erro ao importar empresas:", error);
      toast.error("Erro ao importar empresas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 border-2 border-dashed">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Importar Empresas em Massa</h3>
          <p className="text-sm text-muted-foreground">
            Cole a lista de empresas (uma por linha). Formato: Nome | Endereço ou Nome - Endereço
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="importacao">Lista de Empresas</Label>
            <Textarea
            id="importacao"
            value={textoImportacao}
            onChange={(e) => setTextoImportacao(e.target.value)}
            placeholder={`Exemplo (formato recomendado):
MALL SETE BRASIL LTDA
Rua Patrocínio, 123 sala 703B, B. Carlos Prates,
BH/MG CEP 30.710-140

OUTRA EMPRESA LTDA
Rua Exemplo, 456, Bairro Centro,
Belo Horizonte/MG CEP 30.000-000`}
            rows={12}
            className="mt-2 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            💡 Formato: Nome da empresa (primeira linha), Endereço começando com "Rua" (segunda linha), Cidade/Estado/CEP (terceira linha - opcional). Repita para cada empresa.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={processarTexto} variant="outline" disabled={!textoImportacao.trim()}>
            Processar Texto
          </Button>
          <Button 
            onClick={importarEmpresas} 
            disabled={empresasParseadas.length === 0 || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar {empresasParseadas.length > 0 ? `${empresasParseadas.length} ` : ""}Empresa(s)
              </>
            )}
          </Button>
        </div>

        {empresasParseadas.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Empresas Encontradas ({empresasParseadas.length})</Label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEmpresasParseadas([])}
              >
                Limpar
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
              {empresasParseadas.map((empresa, index) => (
                <div key={index} className="text-sm p-2 bg-secondary/30 rounded">
                  <div className="font-semibold">{empresa.nome}</div>
                  <div className="text-muted-foreground text-xs">{empresa.endereco}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {resultadoImportacao && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              {resultadoImportacao.sucesso > 0 && (
                <Badge className="gap-1.5 bg-success text-success-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {resultadoImportacao.sucesso} importada(s)
                </Badge>
              )}
              {resultadoImportacao.erros.length > 0 && (
                <Badge variant="destructive" className="gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {resultadoImportacao.erros.length} erro(s)
                </Badge>
              )}
            </div>

            {resultadoImportacao.erros.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                {resultadoImportacao.erros.map((erro, index) => (
                  <div key={index} className="text-destructive text-xs p-2 bg-destructive/10 rounded">
                    Linha {erro.linha}: {erro.erro}
                  </div>
                ))}
              </div>
            )}

            {resultadoImportacao.sucesso > 0 && (
              <div className="flex gap-2">
                <Button onClick={onSuccess} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Concluir
                </Button>
                <Button onClick={() => {
                  setTextoImportacao("");
                  setEmpresasParseadas([]);
                  setResultadoImportacao(null);
                }} variant="outline">
                  Importar Mais
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

