-- ROCKSOLID EDU WEEKLY CURRICULUM SCHEMA & SECURITY POLICY
-- Bu scripti Supabase Dashboard SQL Editor üzerinde çalıştırarak tabloları oluşturabilirsiniz.

-- 1. TABLOLARIN OLUŞTURULMASI

-- Haftalık Program Ana Tablosu
CREATE TABLE IF NOT EXISTS weekly_programs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    coach_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    week_start_date date NOT NULL, -- Pazartesi gününün tarihi (YYYY-MM-DD)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Aynı öğrenci için aynı hafta başlangıcında sadece tek bir program olabilir.
    CONSTRAINT unique_student_week UNIQUE (student_id, week_start_date)
);

-- Günlük Görevler Tablosu
CREATE TABLE IF NOT EXISTS daily_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id uuid REFERENCES weekly_programs(id) ON DELETE CASCADE NOT NULL,
    day_of_week integer CHECK (day_of_week BETWEEN 1 AND 7) NOT NULL, -- 1: Pazartesi, ..., 7: Pazar
    subject text NOT NULL,
    description text,
    target_questions integer DEFAULT 0 NOT NULL,
    target_duration integer DEFAULT 0 NOT NULL, -- Pomodoro sayısı veya dakika bazında süre
    is_completed boolean DEFAULT false NOT NULL,
    source_book text,
    sub_topic text,
    page_range text,
    coach_note text
);

-- 2. ROW LEVEL SECURITY (RLS) ETKİNLEŞTİRME
ALTER TABLE weekly_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "weekly_programs_select_policy" ON weekly_programs;
DROP POLICY IF EXISTS "weekly_programs_insert_policy" ON weekly_programs;
DROP POLICY IF EXISTS "weekly_programs_update_policy" ON weekly_programs;
DROP POLICY IF EXISTS "weekly_programs_delete_policy" ON weekly_programs;

DROP POLICY IF EXISTS "daily_tasks_select_policy" ON daily_tasks;
DROP POLICY IF EXISTS "daily_tasks_insert_policy" ON daily_tasks;
DROP POLICY IF EXISTS "daily_tasks_coach_update_policy" ON daily_tasks;
DROP POLICY IF EXISTS "daily_tasks_student_update_policy" ON daily_tasks;
DROP POLICY IF EXISTS "daily_tasks_delete_policy" ON daily_tasks;

-- 3. POLİTİKALAR (weekly_programs)

-- Öğrenci kendi programını, koç da atadığı programı görebilir.
CREATE POLICY "weekly_programs_select_policy" ON weekly_programs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id OR auth.uid() = coach_id);

-- Sadece koçlar program oluşturabilir.
CREATE POLICY "weekly_programs_insert_policy" ON weekly_programs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = coach_id);

-- Sadece programı atayan koç güncelleyebilir.
CREATE POLICY "weekly_programs_update_policy" ON weekly_programs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

-- Sadece programı atayan koç silebilir.
CREATE POLICY "weekly_programs_delete_policy" ON weekly_programs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = coach_id);


-- 4. POLİTİKALAR (daily_tasks)

-- Öğrenci ve koç görevleri görebilir.
CREATE POLICY "daily_tasks_select_policy" ON daily_tasks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM weekly_programs wp
            WHERE wp.id = program_id
            AND (wp.student_id = auth.uid() OR wp.coach_id = auth.uid())
        )
    );

-- Sadece koç görev ekleyebilir.
CREATE POLICY "daily_tasks_insert_policy" ON daily_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM weekly_programs wp
            WHERE wp.id = program_id
            AND wp.coach_id = auth.uid()
        )
    );

-- Koç kendi atadığı görevi güncelleyebilir.
CREATE POLICY "daily_tasks_coach_update_policy" ON daily_tasks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM weekly_programs wp
            WHERE wp.id = program_id
            AND wp.coach_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM weekly_programs wp
            WHERE wp.id = program_id
            AND wp.coach_id = auth.uid()
        )
    );

-- Öğrenci kendi görevini güncelleyebilir (Detay kısıtlaması trigger ile sağlanacaktır).
CREATE POLICY "daily_tasks_student_update_policy" ON daily_tasks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM weekly_programs wp
            WHERE wp.id = program_id
            AND wp.student_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM weekly_programs wp
            WHERE wp.id = program_id
            AND wp.student_id = auth.uid()
        )
    );

-- Sadece koç görevi silebilir.
CREATE POLICY "daily_tasks_delete_policy" ON daily_tasks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM weekly_programs wp
            WHERE wp.id = program_id
            AND wp.coach_id = auth.uid()
        )
    );


-- 5. SİBER GÜVENLİK TETİKLEYİCİSİ (TRIGGER)
-- Öğrencilerin sadece is_completed alanını değiştirebilmesini zorunlu kılar.
-- Diğer alanlar değiştirilmeye çalışılırsa işlem iptal edilir ve hata döner.

CREATE OR REPLACE FUNCTION check_student_task_update()
RETURNS trigger AS $$
BEGIN
    -- İstekte bulunan kullanıcının rolünü kontrol et
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'student'
    ) THEN
        -- is_completed dışındaki tüm alanların değişip değişmediğini kontrol et
        IF OLD.id IS DISTINCT FROM NEW.id OR
           OLD.program_id IS DISTINCT FROM NEW.program_id OR
           OLD.day_of_week IS DISTINCT FROM NEW.day_of_week OR
           OLD.subject IS DISTINCT FROM NEW.subject OR
           OLD.description IS DISTINCT FROM NEW.description OR
           OLD.target_questions IS DISTINCT FROM NEW.target_questions OR
           OLD.target_duration IS DISTINCT FROM NEW.target_duration OR
           OLD.source_book IS DISTINCT FROM NEW.source_book OR
           OLD.sub_topic IS DISTINCT FROM NEW.sub_topic OR
           OLD.page_range IS DISTINCT FROM NEW.page_range OR
           OLD.coach_note IS DISTINCT FROM NEW.coach_note THEN
            RAISE EXCEPTION 'Öğrenciler sadece görev tamamlanma durumunu (is_completed) güncelleyebilir.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı tabloya bağla
DROP TRIGGER IF EXISTS enforce_student_task_update_restriction ON daily_tasks;
CREATE TRIGGER enforce_student_task_update_restriction
BEFORE UPDATE ON daily_tasks
FOR EACH ROW
EXECUTE FUNCTION check_student_task_update();
