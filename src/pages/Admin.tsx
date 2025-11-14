import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, ClipboardList, Upload } from "lucide-react";
import { EmpresasList } from "@/components/admin/EmpresasList";
import { NovaEmpresaForm } from "@/components/admin/NovaEmpresaForm";
import { ImportarEmpresas } from "@/components/admin/ImportarEmpresas";
import { HistoricoChamadas } from "@/components/admin/HistoricoChamadas";
import { testSupabaseConnection } from "@/lib/test-supabase";

const Admin = () => {
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false);
  const [showImportar, setShowImportar] = useState(false);

  useEffect(() => {
    // Testar conexão ao carregar a página
    testSupabaseConnection();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sistema de Vistorias</h1>
                <p className="text-sm text-muted-foreground">Gestão de Empresas Credenciadas</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/">Voltar para Busca</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="empresas" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="empresas" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresas" className="space-y-6">
            <Card className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Empresas Credenciadas</h2>
                  <p className="text-sm text-muted-foreground">Gerencie as empresas aptas para vistorias</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setShowImportar(!showImportar);
                      setShowNovaEmpresa(false);
                    }} 
                    variant="outline"
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Importar em Massa
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowNovaEmpresa(!showNovaEmpresa);
                      setShowImportar(false);
                    }} 
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Empresa
                  </Button>
                </div>
              </div>

              {showImportar && (
                <ImportarEmpresas 
                  onSuccess={() => {
                    setShowImportar(false);
                    window.location.reload();
                  }}
                  onCancel={() => setShowImportar(false)}
                />
              )}

              {showNovaEmpresa && (
                <NovaEmpresaForm onSuccess={() => setShowNovaEmpresa(false)} />
              )}

              <EmpresasList />
            </Card>
          </TabsContent>

          <TabsContent value="historico">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">Histórico de Chamadas</h2>
                <p className="text-sm text-muted-foreground">Visualize o histórico de solicitações de vistorias</p>
              </div>
              <HistoricoChamadas />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
