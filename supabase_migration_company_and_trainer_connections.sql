-- ==========================================================
-- FITVERSE — COMPANY TRAINERS & TRAINER STUDENTS MIGRATION
-- ==========================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- ==========================================================

-- 1. Tabela de Vínculo: Empresa <-> Personal Trainer
CREATE TABLE IF NOT EXISTS public.company_trainers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_company_trainer UNIQUE (company_id, trainer_id)
);

-- 2. Tabela de Vínculo: Personal Trainer <-> Aluno
CREATE TABLE IF NOT EXISTS public.trainer_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_trainer_student UNIQUE (trainer_id, student_id)
);

-- Habilitar RLS
ALTER TABLE public.company_trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para company_trainers
DROP POLICY IF EXISTS "Permitir leitura pública de company_trainers" ON public.company_trainers;
CREATE POLICY "Permitir leitura pública de company_trainers"
  ON public.company_trainers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção por empresas e personais" ON public.company_trainers;
CREATE POLICY "Permitir inserção por empresas e personais"
  ON public.company_trainers FOR INSERT WITH CHECK (auth.uid() = company_id OR auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Permitir atualização pelos envolvidos em company_trainers" ON public.company_trainers;
CREATE POLICY "Permitir atualização pelos envolvidos em company_trainers"
  ON public.company_trainers FOR UPDATE USING (auth.uid() = company_id OR auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Permitir deleção pelos envolvidos em company_trainers" ON public.company_trainers;
CREATE POLICY "Permitir deleção pelos envolvidos em company_trainers"
  ON public.company_trainers FOR DELETE USING (auth.uid() = company_id OR auth.uid() = trainer_id);

-- Políticas RLS para trainer_students
DROP POLICY IF EXISTS "Permitir leitura pública de trainer_students" ON public.trainer_students;
CREATE POLICY "Permitir leitura pública de trainer_students"
  ON public.trainer_students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção por personais e alunos" ON public.trainer_students;
CREATE POLICY "Permitir inserção por personais e alunos"
  ON public.trainer_students FOR INSERT WITH CHECK (auth.uid() = trainer_id OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Permitir atualização pelos envolvidos em trainer_students" ON public.trainer_students;
CREATE POLICY "Permitir atualização pelos envolvidos em trainer_students"
  ON public.trainer_students FOR UPDATE USING (auth.uid() = trainer_id OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Permitir deleção pelos envolvidos em trainer_students" ON public.trainer_students;
CREATE POLICY "Permitir deleção pelos envolvidos em trainer_students"
  ON public.trainer_students FOR DELETE USING (auth.uid() = trainer_id OR auth.uid() = student_id);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_company_trainers_company ON public.company_trainers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_trainers_trainer ON public.company_trainers(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_trainer ON public.trainer_students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_student ON public.trainer_students(student_id);
