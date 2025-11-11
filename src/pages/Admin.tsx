import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, ClipboardList } from "lucide-react";
import { EmpresasList } from "@/components/admin/EmpresasList";
import { NovaEmpresaForm } from "@/components/admin/NovaEmpresaForm";
import { HistoricoChamadas } from "@/components/admin/HistoricoChamadas";

const Admin = () => {
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false);

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
              <a href="/">Voltar para Busca</a>
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
                <Button onClick={() => setShowNovaEmpresa(!showNovaEmpresa)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Empresa
                </Button>
              </div>

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
