-- ============================================
-- FITVERSE — DELETE POLICIES MIGRATION
-- ============================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- para permitir a exclusão permanente de conversas por seus participantes.
-- ============================================

-- Permite que os participantes excluam suas próprias conversas
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;
CREATE POLICY "Users can delete their conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = ANY(participant_ids));
