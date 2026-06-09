-- =====================================================================
-- RESET DE DADOS - MANTÉM USUÁRIOS
-- =====================================================================
-- Este script apaga TODOS os dados de gestão (fazendas, lotes, gado,
-- pesagens, pastos, ocupações, defensivos e sessões de curral),
-- mas PRESERVA as contas de usuário:
--   - auth.users      (autenticação)
--   - public.profiles (perfis)
--   - public.admin_users (administradores)
--
-- TRUNCATE ... CASCADE garante que as tabelas dependentes sejam
-- limpas na ordem correta, respeitando as foreign keys.
-- =====================================================================

TRUNCATE TABLE
  public.animais_sessao,
  public.sessoes_curral,
  public.pesagens,
  public.aplicacao_defensivos,
  public.ocupacao_pastos,
  public.gado,
  public.pastos,
  public.lotes,
  public.fazendas
RESTART IDENTITY CASCADE;

-- Confirmação (opcional): contagem de registros restantes nas tabelas limpas
SELECT 'fazendas' AS tabela, COUNT(*) AS registros FROM public.fazendas
UNION ALL SELECT 'lotes', COUNT(*) FROM public.lotes
UNION ALL SELECT 'gado', COUNT(*) FROM public.gado
UNION ALL SELECT 'pesagens', COUNT(*) FROM public.pesagens
UNION ALL SELECT 'pastos', COUNT(*) FROM public.pastos
UNION ALL SELECT 'ocupacao_pastos', COUNT(*) FROM public.ocupacao_pastos
UNION ALL SELECT 'aplicacao_defensivos', COUNT(*) FROM public.aplicacao_defensivos
UNION ALL SELECT 'sessoes_curral', COUNT(*) FROM public.sessoes_curral
UNION ALL SELECT 'animais_sessao', COUNT(*) FROM public.animais_sessao
UNION ALL SELECT 'profiles (preservado)', COUNT(*) FROM public.profiles;
