-- ============================================================================
-- FITVERSE — CLEANUP & SECURITY POLICIES FOR CHALLENGES
-- ============================================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================================================

-- ── 1. SEGURANÇA: POLÍTICAS DE EXCLUSÃO (DELETE) ─────────────────────────────
-- Permite que usuários autenticados cancelem ou saiam de desafios excluindo
-- seus próprios registros em challenge_participants e challenge_checkins.

DROP POLICY IF EXISTS "Users can delete their own participation" ON public.challenge_participants;
CREATE POLICY "Users can delete their own participation"
  ON public.challenge_participants FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own challenge checkins" ON public.challenge_checkins;
CREATE POLICY "Users can delete their own challenge checkins"
  ON public.challenge_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- ── 2. EXCLUSÃO DOS USUÁRIOS ESPECIFICADOS ───────────────────────────────────
-- Remove as contas da tabela auth.users (o cascade cuidará de remover
-- perfis, posts, checkins, likes, e demais dados dependentes).

DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM public.profiles
  WHERE 
    LOWER(REPLACE(username, '@', '')) IN (
      'jaqueline ribeiro259', 
      'jaqueline3645', 
      'jefferson ribeiro537', 
      'eff21074', 
      'jeffersonesmael', 
      'test user8', 
      'test user307'
    )
    OR LOWER(REPLACE(display_name, '@', '')) IN (
      'jaqueline ribeiro259', 
      'jaqueline3645', 
      'jefferson ribeiro537', 
      'eff21074', 
      'jeffersonesmael', 
      'test user8', 
      'test user307'
    )
);

-- ── 3. REMOÇÃO DE TODOS OS POSTS EXISTENTES ─────────────────────────────────
-- Limpa a tabela de posts/vídeos de todos os usuários da plataforma.
-- (As curtidas, comentários e marcações associadas serão limpos via cascade).

DELETE FROM public.videos;
