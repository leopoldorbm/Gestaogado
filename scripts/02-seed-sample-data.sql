-- Dados de exemplo para o sistema de gestão de gado

-- Inserir fazenda de exemplo
INSERT INTO fazendas (nome, endereco, proprietario) VALUES 
('Fazenda São João', 'Estrada Rural, km 15, Zona Rural', 'João Silva')
ON CONFLICT DO NOTHING;

-- Inserir lotes de exemplo
INSERT INTO lotes (fazenda_id, nome, area_hectares, capacidade_animais) 
SELECT f.id, 'Pasto 1', 50.0, 100 FROM fazendas f WHERE f.nome = 'Fazenda São João'
ON CONFLICT DO NOTHING;

INSERT INTO lotes (fazenda_id, nome, area_hectares, capacidade_animais) 
SELECT f.id, 'Pasto 2', 75.5, 150 FROM fazendas f WHERE f.nome = 'Fazenda São João'
ON CONFLICT DO NOTHING;

-- Inserir alguns animais de exemplo
INSERT INTO gado (fazenda_id, lote_id, marca_fogo, sexo, origem, data_nascimento, valor_compra)
SELECT 
  f.id,
  l.id,
  'SF001',
  'Fêmea',
  'Fazenda Vizinha',
  '2022-03-15',
  2500.00
FROM fazendas f, lotes l 
WHERE f.nome = 'Fazenda São João' AND l.nome = 'Pasto 1'
ON CONFLICT (marca_fogo) DO NOTHING;

INSERT INTO gado (fazenda_id, lote_id, marca_fogo, sexo, origem, data_nascimento, valor_compra)
SELECT 
  f.id,
  l.id,
  'SF002',
  'Macho',
  'Leilão Regional',
  '2021-08-20',
  3200.00
FROM fazendas f, lotes l 
WHERE f.nome = 'Fazenda São João' AND l.nome = 'Pasto 1'
ON CONFLICT (marca_fogo) DO NOTHING;

-- Inserir pesagens de exemplo
INSERT INTO pesagens (gado_id, peso, data_pesagem)
SELECT g.id, 450.5, '2024-01-15'
FROM gado g WHERE g.marca_fogo = 'SF001'
ON CONFLICT DO NOTHING;

INSERT INTO pesagens (gado_id, peso, data_pesagem)
SELECT g.id, 480.0, '2024-06-15'
FROM gado g WHERE g.marca_fogo = 'SF001'
ON CONFLICT DO NOTHING;

INSERT INTO pesagens (gado_id, peso, data_pesagem)
SELECT g.id, 520.0, '2024-01-15'
FROM gado g WHERE g.marca_fogo = 'SF002'
ON CONFLICT DO NOTHING;
