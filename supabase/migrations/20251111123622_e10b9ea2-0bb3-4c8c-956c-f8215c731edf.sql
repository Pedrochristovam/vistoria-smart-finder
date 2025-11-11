-- Criar tabela de empresas credenciadas
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem INTEGER NOT NULL UNIQUE,
  numero_contrato TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  chamadas_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de serviços (atividades)
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ordem INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir os serviços padrão
INSERT INTO public.servicos (nome, ordem) VALUES
  ('Avaliação laudo simplificado', 1),
  ('Laudo completo', 2),
  ('Avaliação imóvel ou benfeitoria rural ou florestal', 3),
  ('Levantamento topográfico', 4),
  ('Georreferenciamento', 5),
  ('Vistoria de obra', 6);

-- Criar tabela de regiões de MG
CREATE TABLE IF NOT EXISTS public.regioes_mg (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir as regiões de MG
INSERT INTO public.regioes_mg (nome) VALUES
  ('CENTRAL'),
  ('ZONA DA MATA'),
  ('SUL DE MINAS'),
  ('TRIANGULO'),
  ('ALTO PARAIBA'),
  ('CENTRO OESTE'),
  ('NOROESTE DE MINAS'),
  ('NORTE DE MINAS'),
  ('JEQUITINHONHA/MUCURI'),
  ('RIO DOCE');

-- Criar tabela de estados
CREATE TABLE IF NOT EXISTS public.estados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sigla TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir os estados
INSERT INTO public.estados (sigla, nome) VALUES
  ('AC', 'Acre'),
  ('AL', 'Alagoas'),
  ('AP', 'Amapá'),
  ('AM', 'Amazonas'),
  ('BA', 'Bahia'),
  ('CE', 'Ceará'),
  ('DF', 'Distrito Federal'),
  ('ES', 'Espírito Santo'),
  ('GO', 'Goiás'),
  ('MA', 'Maranhão'),
  ('MT', 'Mato Grosso'),
  ('MS', 'Mato Grosso do Sul'),
  ('MG', 'Minas Gerais'),
  ('PA', 'Pará'),
  ('PB', 'Paraíba'),
  ('PR', 'Paraná'),
  ('PE', 'Pernambuco'),
  ('PI', 'Piauí'),
  ('RJ', 'Rio de Janeiro'),
  ('RN', 'Rio Grande do Norte'),
  ('RS', 'Rio Grande do Sul'),
  ('RO', 'Rondônia'),
  ('RR', 'Roraima'),
  ('SC', 'Santa Catarina'),
  ('SP', 'São Paulo'),
  ('SE', 'Sergipe'),
  ('TO', 'Tocantins');

-- Criar tabela de relação empresa-serviços
CREATE TABLE IF NOT EXISTS public.empresa_servicos (
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  PRIMARY KEY (empresa_id, servico_id)
);

-- Criar tabela de relação empresa-regiões MG
CREATE TABLE IF NOT EXISTS public.empresa_regioes_mg (
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  regiao_id UUID NOT NULL REFERENCES public.regioes_mg(id) ON DELETE CASCADE,
  PRIMARY KEY (empresa_id, regiao_id)
);

-- Criar tabela de relação empresa-estados
CREATE TABLE IF NOT EXISTS public.empresa_estados (
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  estado_id UUID NOT NULL REFERENCES public.estados(id) ON DELETE CASCADE,
  PRIMARY KEY (empresa_id, estado_id)
);

-- Criar tabela de histórico de chamadas
CREATE TABLE IF NOT EXISTS public.historico_chamadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  endereco_demanda TEXT NOT NULL,
  municipio TEXT,
  estado TEXT,
  servicos_solicitados TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (sem restrições para MVP)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regioes_mg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_regioes_mg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_chamadas ENABLE ROW LEVEL SECURITY;

-- Criar políticas para acesso público (para MVP administrativo)
CREATE POLICY "Permitir leitura pública de empresas" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "Permitir escrita pública de empresas" ON public.empresas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública de empresas" ON public.empresas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública de empresas" ON public.empresas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública de serviços" ON public.servicos FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de regiões MG" ON public.regioes_mg FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de estados" ON public.estados FOR SELECT USING (true);

CREATE POLICY "Permitir escrita pública de empresa_servicos" ON public.empresa_servicos FOR ALL USING (true);
CREATE POLICY "Permitir escrita pública de empresa_regioes_mg" ON public.empresa_regioes_mg FOR ALL USING (true);
CREATE POLICY "Permitir escrita pública de empresa_estados" ON public.empresa_estados FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de histórico" ON public.historico_chamadas FOR SELECT USING (true);
CREATE POLICY "Permitir escrita pública de histórico" ON public.historico_chamadas FOR INSERT WITH CHECK (true);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para updated_at
CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_empresas_ordem ON public.empresas(ordem);
CREATE INDEX IF NOT EXISTS idx_empresas_chamadas ON public.empresas(chamadas_count);
CREATE INDEX IF NOT EXISTS idx_historico_empresa ON public.historico_chamadas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_historico_created ON public.historico_chamadas(created_at DESC);