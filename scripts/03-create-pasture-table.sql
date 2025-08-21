-- Criar tabela de pastos
CREATE TABLE IF NOT EXISTS pastos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    numero VARCHAR(20),
    area_hectares DECIMAL(10,2) NOT NULL,
    cor VARCHAR(7) NOT NULL, -- Código hexadecimal da cor
    coordenadas JSONB NOT NULL, -- Array de coordenadas [lat, lng]
    fazenda_id UUID REFERENCES fazendas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pastos_fazenda ON pastos(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_pastos_nome ON pastos(nome);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pastos_updated_at 
    BEFORE UPDATE ON pastos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE pastos IS 'Tabela para armazenar informações dos pastos mapeados';
COMMENT ON COLUMN pastos.coordenadas IS 'Array JSON com coordenadas do polígono [[lat,lng], [lat,lng], ...]';
COMMENT ON COLUMN pastos.cor IS 'Cor do pasto no mapa em formato hexadecimal (#RRGGBB)';
