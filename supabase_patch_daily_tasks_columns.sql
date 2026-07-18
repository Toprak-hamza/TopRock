-- BITIGEDU DAILY TASKS COLUMNS PATCH
-- Eğer Supabase veritabanınızdaki 'daily_tasks' tablosunda sayfa aralığı, alt konu vb. sütunlar eksikse 
-- bu komutları Supabase SQL Editor üzerinde çalıştırarak sütunları ekleyebilirsiniz.

ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS source_book TEXT;
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS sub_topic TEXT;
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS page_range TEXT;
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS coach_note TEXT;
