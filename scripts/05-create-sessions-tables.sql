-- Creating tables for cattle yard sessions and management events
-- Tabela de sessões de curral
CREATE TABLE IF NOT EXISTS sessoes_curral (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  nome_sessao VARCHAR(100) NOT NULL,
  tipo_manejo VARCHAR(50) NOT NULL, -- 'sanitario', 'iatf', 'pesagem', 'medicacao', 'outros'
  descricao_manejo TEXT,
  data_sessao DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio TIME,
  hora_fim TIME,
  status VARCHAR(20) DEFAULT 'ativa', -- 'ativa', 'finalizada', 'cancelada'
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de animais manejados por sessão
CREATE TABLE IF NOT EXISTS animais_sessao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID REFERENCES sessoes_curral(id) ON DELETE CASCADE,
  gado_id UUID REFERENCES gado(id) ON DELETE CASCADE,
  peso_registrado DECIMAL(8,2),
  observacoes_animal TEXT,
  procedimentos_realizados TEXT[],
  medicamentos_aplicados TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sessoes_curral_user_fazenda ON sessoes_curral(user_id, fazenda_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_curral_data ON sessoes_curral(data_sessao);
CREATE INDEX IF NOT EXISTS idx_animais_sessao_sessao ON animais_sessao(sessao_id);

-- RLS (Row Level Security)
ALTER TABLE sessoes_curral ENABLE ROW LEVEL SECURITY;
ALTER TABLE animais_sessao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sessoes_curral
CREATE POLICY "Users can view own sessions" ON sessoes_curral
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON sessoes_curral
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessoes_curral
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON sessoes_curral
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para animais_sessao
CREATE POLICY "Users can view own session animals" ON animais_sessao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessoes_curral 
      WHERE sessoes_curral.id = animais_sessao.sessao_id 
      AND sessoes_curral.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own session animals" ON animais_sessao
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessoes_curral 
      WHERE sessoes_curral.id = animais_sessao.sessao_id 
      AND sessoes_curral.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own session animals" ON animais_sessao
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessoes_curral 
      WHERE sessoes_curral.id = animais_sessao.sessao_id 
      AND sessoes_curral.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own session animals" ON animais_sessao
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessoes_curral 
      WHERE sessoes_curral.id = animais_sessao.sessao_id 
      AND sessoes_curral.user_id = auth.uid()
    )
  );
