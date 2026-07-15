-- 1. NOTIFICATIONS TABLOSU OLUŞTUR / GÜNCELLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    type TEXT NOT NULL,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kolon güncellemeleri (Eski verileri bozmadan güvenli güncelleme)
DO $$ 
BEGIN 
    -- user_id kolonu yoksa ekle (Alıcıyı temsil eder)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        -- Eski kayıtlarda alıcıyı öğrenci olarak ata
        UPDATE public.notifications SET user_id = student_id;
        -- user_id kolonu artık zorunlu
        ALTER TABLE public.notifications ALTER COLUMN user_id SET NOT NULL;
    END IF;

    -- Gönderen/İlgili öğrenci alanı (student_id) artık koç bildirimleri için null olabilir
    ALTER TABLE public.notifications ALTER COLUMN student_id DROP NOT NULL;
END $$;

-- RLS Etkinleştir
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Politikaları Temizle
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

-- Alıcı (user_id) sadece kendi bildirimlerini görebilir.
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Kimliği doğrulanmış herkes bildirim ekleyebilir (Öğrenciler koçlarına, koçlar öğrencilerine veya sistem tetikleyicileri).
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Alıcı sadece kendi bildirimlerini okundu işaretleyebilir veya güncelleyebilir.
CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Alıcı kendi bildirimlerini silebilir.
CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 2. BOOK_TRACKER TABLOSU
CREATE TABLE IF NOT EXISTS public.book_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    total_items INTEGER NOT NULL CHECK (total_items > 0),
    completed_items INTEGER NOT NULL DEFAULT 0 CHECK (completed_items >= 0),
    target_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Etkinleştir
ALTER TABLE public.book_tracker ENABLE ROW LEVEL SECURITY;

-- Politikaları Temizle
DROP POLICY IF EXISTS "book_tracker_select_policy" ON public.book_tracker;
DROP POLICY IF EXISTS "book_tracker_insert_policy" ON public.book_tracker;
DROP POLICY IF EXISTS "book_tracker_update_policy" ON public.book_tracker;
DROP POLICY IF EXISTS "book_tracker_delete_policy" ON public.book_tracker;

-- Öğrenci kendi kitaplarını görebilir, koçlar da öğrencilerinin kitaplarını görebilir.
CREATE POLICY "book_tracker_select_policy" ON public.book_tracker
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id
        OR auth.uid() = (SELECT p.coach_id FROM public.profiles p WHERE p.id = student_id)
    );

-- Öğrenci kitap ekleyebilir.
CREATE POLICY "book_tracker_insert_policy" ON public.book_tracker
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Öğrenci kendi kitaplarını güncelleyebilir (ilerleme kaydetmek için).
CREATE POLICY "book_tracker_update_policy" ON public.book_tracker
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Öğrenci kitabını silebilir.
CREATE POLICY "book_tracker_delete_policy" ON public.book_tracker
    FOR DELETE
    TO authenticated
    USING (auth.uid() = student_id);
