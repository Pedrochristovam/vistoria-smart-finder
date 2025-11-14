import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { EditarEmpresaForm } from "./EditarEmpresaForm";

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

export const EmpresasList = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);

  const loadEmpresas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("ordem");

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      toast.error("Erro ao carregar empresas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmpresas();
  }, []);

  const deleteEmpresa = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return;

    try {
      const { error } = await supabase.from("empresas").delete().eq("id", id);
      if (error) throw error;
      toast.success("Empresa excluída com sucesso");
      loadEmpresas();
    } catch (error) {
      console.error("Erro ao excluir empresa:", error);
      toast.error("Erro ao excluir empresa");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Nenhuma empresa cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Ordem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Contrato</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead className="text-center">Chamadas</TableHead>
            <TableHead className="w-32 text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((empresa) => (
            <TableRow key={empresa.id}>
              <TableCell>
                <Badge variant="outline">{empresa.ordem}</Badge>
              </TableCell>
              <TableCell className="font-medium">{empresa.nome}</TableCell>
              <TableCell>{empresa.numero_contrato}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{empresa.email}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{empresa.telefone}</TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{empresa.chamadas_count}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEmpresaEditando(empresa);
                      setDialogAberto(true);
                    }}
                    className="text-primary hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteEmpresa(empresa.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditarEmpresaForm
        empresa={empresaEditando}
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onSuccess={() => {
          loadEmpresas();
          setEmpresaEditando(null);
        }}
      />
    </div>
  );
};
