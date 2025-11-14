// Arquivo temporário para testar conexão com Supabase
import { supabase } from "@/integrations/supabase/client";

export async function testSupabaseConnection() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  console.log("=== TESTE DE CONEXÃO SUPABASE ===");
  console.log("URL configurada:", SUPABASE_URL ? "✅ Sim" : "❌ Não");
  console.log("Chave configurada:", SUPABASE_KEY ? "✅ Sim" : "❌ Não");
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Variáveis de ambiente não configuradas!");
    return false;
  }

  if (!supabase) {
    console.error("❌ Cliente Supabase não foi criado!");
    return false;
  }

  try {
    // Testar conexão fazendo uma query simples
    const { data, error } = await supabase.from("servicos").select("count").limit(1);
    
    if (error) {
      console.error("❌ Erro ao conectar:", error.message);
      return false;
    }
    
    console.log("✅ Conexão com Supabase funcionando!");
    return true;
  } catch (error: any) {
    console.error("❌ Erro ao testar conexão:", error.message);
    return false;
  }
}




