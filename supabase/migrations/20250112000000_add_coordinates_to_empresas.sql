-- Adicionar campos de latitude e longitude na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Criar índice para melhorar buscas por localização
CREATE INDEX IF NOT EXISTS idx_empresas_coordinates ON public.empresas(latitude, longitude);

