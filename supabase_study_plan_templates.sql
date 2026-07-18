-- BITIGEDU STUDY PLAN TEMPLATES (HAZIR ŞABLON PLANLAR)
-- Bu scripti Supabase SQL Editor üzerinde çalıştırarak tabloyu ve RLS politikalarını oluşturabilirsiniz.

CREATE TABLE IF NOT EXISTS public.study_plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    schedule_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) Etkinleştirme
ALTER TABLE public.study_plan_templates ENABLE ROW LEVEL SECURITY;

-- Politikaları Temizleme
DROP POLICY IF EXISTS "study_plan_templates_select_policy" ON public.study_plan_templates;
DROP POLICY IF EXISTS "study_plan_templates_insert_policy" ON public.study_plan_templates;
DROP POLICY IF EXISTS "study_plan_templates_update_policy" ON public.study_plan_templates;
DROP POLICY IF EXISTS "study_plan_templates_delete_policy" ON public.study_plan_templates;

-- 1. Her hoca / koç sadece KENDİ oluşturduğu şablonları görebilir
CREATE POLICY "study_plan_templates_select_policy" ON public.study_plan_templates
    FOR SELECT
    TO authenticated
    USING (auth.uid() = coach_id);

-- 2. Her hoca / koç sadece KENDİ id'si ile yeni şablon ekleyebilir
CREATE POLICY "study_plan_templates_insert_policy" ON public.study_plan_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = coach_id);

-- 3. Her hoca / koç sadece KENDİ şablonunu güncelleyebilir
CREATE POLICY "study_plan_templates_update_policy" ON public.study_plan_templates
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

-- 4. Her hoca / koç sadece KENDİ şablonunu silebilir
CREATE POLICY "study_plan_templates_delete_policy" ON public.study_plan_templates
    FOR DELETE
    TO authenticated
    USING (auth.uid() = coach_id);
