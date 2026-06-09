-- ==========================================================
-- FITVERSE — BUSINESS FEEDBACKS UNIQUE & EDITABLE MIGRATION
-- ==========================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- ==========================================================

-- 1. Adicionar coluna is_edited se não existir
ALTER TABLE public.business_feedbacks ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;

-- 2. Limpar feedbacks duplicados antigos antes de aplicar a restrição de unicidade
-- (Mantém a avaliação mais recente de cada usuário para cada empresa)
DELETE FROM public.business_feedbacks a
USING public.business_feedbacks b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.business_id = b.business_id;

-- 3. Adicionar restrição de unicidade para (user_id, business_id)
ALTER TABLE public.business_feedbacks
  DROP CONSTRAINT IF EXISTS unique_user_business_feedback;

ALTER TABLE public.business_feedbacks
  ADD CONSTRAINT unique_user_business_feedback UNIQUE (user_id, business_id);

-- 4. Criar política RLS que permite atualização das avaliações pelo próprio autor
DROP POLICY IF EXISTS "Users can update their own feedback" ON public.business_feedbacks;
CREATE POLICY "Users can update their own feedback"
  ON public.business_feedbacks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
