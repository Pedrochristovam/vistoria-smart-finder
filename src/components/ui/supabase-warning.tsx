import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const SupabaseWarning = () => {
  if (supabase) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Supabase não configurado</AlertTitle>
      <AlertDescription>
        Configure as variáveis <code>VITE_SUPABASE_URL</code> e{" "}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no arquivo <code>.env</code> para usar todas as funcionalidades.
      </AlertDescription>
    </Alert>
  );
};




