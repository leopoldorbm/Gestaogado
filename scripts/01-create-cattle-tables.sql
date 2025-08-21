-- Execute this script to create the database tables

-- Criação das tabelas para o sistema de gestão de gado

-- Tabela de fazendas/propriedades
CREATE TABLE IF NOT EXISTS fazendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  endereco TEXT,
  proprietario VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de lotes/pastos
CREATE TABLE IF NOT EXISTS lotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  area_hectares DECIMAL(10,2),
  capacidade_animais INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela principal de gado
CREATE TABLE IF NOT EXISTS gado (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  
  -- Identificação
  marca_fogo VARCHAR(50) UNIQUE NOT NULL,
  brinco_eletronico VARCHAR(100),
  
  -- Informações básicas
  sexo VARCHAR(10) CHECK (sexo IN ('Macho', 'Fêmea')) NOT NULL,
  origem VARCHAR(255),
  status_reproducao VARCHAR(50) CHECK (status_reproducao IN ('Prenha', 'Vazia', 'Não se aplica')) DEFAULT 'Não se aplica',
  
  -- Dados de nascimento e genealogia
  data_nascimento DATE,
  pai_id UUID REFERENCES gado(id) ON DELETE SET NULL,
  mae_id UUID REFERENCES gado(id) ON DELETE SET NULL,
  
  -- Datas de entrada e saída
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  data_saida DATE,
  motivo_saida VARCHAR(255),
  
  -- Valores financeiros
  valor_compra DECIMAL(10,2),
  valor_venda DECIMAL(10,2),
  
  -- Status do animal
  ativo BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pesagens
CREATE TABLE IF NOT EXISTS pesagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gado_id UUID REFERENCES gado(id) ON DELETE CASCADE,
  peso DECIMAL(6,2) NOT NULL,
  data_pesagem DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_gado_marca_fogo ON gado(marca_fogo);
CREATE INDEX IF NOT EXISTS idx_gado_fazenda ON gado(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_gado_lote ON gado(lote_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_gado ON pesagens(gado_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_data ON pesagens(data_pesagem);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_fazendas_updated_at BEFORE UPDATE ON fazendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lotes_updated_at BEFORE UPDATE ON lotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gado_updated_at BEFORE UPDATE ON gado FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
