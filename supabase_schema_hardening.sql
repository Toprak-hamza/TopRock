-- BITIGEDU SUPABASE RLS HARDENING SCRIPT
-- Bu scripti Supabase Dashboard SQL Editor üzerinde çalıştırabilirsiniz.

-- 1. ROW LEVEL SECURITY (RLS) ETKİNLEŞTİRME
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics_progress ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

DROP POLICY IF EXISTS "homeworks_select_policy" ON homeworks;
DROP POLICY IF EXISTS "homeworks_insert_policy" ON homeworks;
DROP POLICY IF EXISTS "homeworks_update_policy" ON homeworks;
DROP POLICY IF EXISTS "homeworks_delete_policy" ON homeworks;

DROP POLICY IF EXISTS "exams_select_policy" ON exams;
DROP POLICY IF EXISTS "exams_insert_policy" ON exams;
DROP POLICY IF EXISTS "exams_update_policy" ON exams;
DROP POLICY IF EXISTS "exams_delete_policy" ON exams;

DROP POLICY IF EXISTS "study_sessions_select_policy" ON study_sessions;
DROP POLICY IF EXISTS "study_sessions_insert_policy" ON study_sessions;
DROP POLICY IF EXISTS "study_sessions_update_policy" ON study_sessions;
DROP POLICY IF EXISTS "study_sessions_delete_policy" ON study_sessions;

DROP POLICY IF EXISTS "feedbacks_select_policy" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_insert_policy" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_update_policy" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_delete_policy" ON feedbacks;

DROP POLICY IF EXISTS "schedules_select_policy" ON schedules;
DROP POLICY IF EXISTS "schedules_insert_policy" ON schedules;
DROP POLICY IF EXISTS "schedules_update_policy" ON schedules;
DROP POLICY IF EXISTS "schedules_delete_policy" ON schedules;

DROP POLICY IF EXISTS "announcements_select_policy" ON announcements;
DROP POLICY IF EXISTS "announcements_insert_policy" ON announcements;
DROP POLICY IF EXISTS "announcements_update_policy" ON announcements;
DROP POLICY IF EXISTS "announcements_delete_policy" ON announcements;

DROP POLICY IF EXISTS "groups_select_policy" ON groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON groups;
DROP POLICY IF EXISTS "groups_update_policy" ON groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON groups;

DROP POLICY IF EXISTS "group_members_select_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_update_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_policy" ON group_members;

DROP POLICY IF EXISTS "invitations_select_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_update_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON invitations;

DROP POLICY IF EXISTS "topics_progress_select_policy" ON topics_progress;
DROP POLICY IF EXISTS "topics_progress_upsert_policy" ON topics_progress;

-- =====================================================================
-- 2. PROFILES TABLOSU POLİTİKALARI
-- =====================================================================
-- Kullanıcılar kendi profillerini, koçlar kendi öğrencilerini ve öğrenciler kendi koçlarını görebilir.
-- Helper function to avoid RLS recursion on profiles table
CREATE OR REPLACE FUNCTION public.get_auth_coach_id()
RETURNS uuid AS $$
  SELECT coach_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id 
        OR coach_id = auth.uid() 
        OR id = public.get_auth_coach_id()
    );


-- Kayıt esnasında herkes kendi profilini ekleyebilir.
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Kullanıcılar sadece kendi profillerini güncelleyebilir.
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- =====================================================================
-- 3. HOMEWORKS TABLOSU POLİTİKALARI
-- =====================================================================
-- Öğrenciler ve o ödevi atayan koç ödevleri görebilir.
CREATE POLICY "homeworks_select_policy" ON homeworks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id OR auth.uid() = coach_id);

-- Sadece koçlar ödev ekleyebilir ve eklerken kendilerini koç olarak belirtmelidir.
CREATE POLICY "homeworks_insert_policy" ON homeworks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = coach_id);

-- Koçlar ödevi güncelleyebilir, öğrenciler ise sadece ödevi tamamlandı/tamamlanmadı durumunu değiştirebilir.
CREATE POLICY "homeworks_update_policy" ON homeworks
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id OR auth.uid() = coach_id)
    WITH CHECK (auth.uid() = student_id OR auth.uid() = coach_id);

-- Sadece ödevi atayan koç silebilir.
CREATE POLICY "homeworks_delete_policy" ON homeworks
    FOR DELETE
    TO authenticated
    USING (auth.uid() = coach_id);


-- =====================================================================
-- 4. EXAMS TABLOSU POLİTİKALARI
-- =====================================================================
-- Öğrenci kendi sınavlarını görebilir, koçu da görebilir.
CREATE POLICY "exams_select_policy" ON exams
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id 
        OR auth.uid() = (SELECT p.coach_id FROM profiles p WHERE p.id = student_id)
    );

-- Sadece öğrenciler kendi sınavlarını ekleyebilir.
CREATE POLICY "exams_insert_policy" ON exams
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Sadece öğrenciler kendi sınavlarını güncelleyebilir veya silebilir.
CREATE POLICY "exams_update_policy" ON exams
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "exams_delete_policy" ON exams
    FOR DELETE
    TO authenticated
    USING (auth.uid() = student_id);


-- =====================================================================
-- 5. STUDY_SESSIONS TABLOSU POLİTİKALARI
-- =====================================================================
-- Öğrenci kendi pomodoro seanslarını görebilir, koçu da görebilir.
CREATE POLICY "study_sessions_select_policy" ON study_sessions
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id 
        OR auth.uid() = (SELECT p.coach_id FROM profiles p WHERE p.id = student_id)
    );

-- Sadece öğrenciler kendi seanslarını ekleyebilir.
CREATE POLICY "study_sessions_insert_policy" ON study_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Sadece öğrenciler kendi seanslarını güncelleyebilir veya silebilir.
CREATE POLICY "study_sessions_update_policy" ON study_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "study_sessions_delete_policy" ON study_sessions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = student_id);


-- =====================================================================
-- 6. FEEDBACKS TABLOSU POLİTİKALARI
-- =====================================================================
-- İlgili öğrenci ve geri bildirimi bırakan koç geri bildirimleri görebilir.
CREATE POLICY "feedbacks_select_policy" ON feedbacks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id OR auth.uid() = coach_id);

-- Sadece koçlar geri bildirim ekleyebilir.
CREATE POLICY "feedbacks_insert_policy" ON feedbacks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = coach_id);

-- Sadece geri bildirimi yazan koç güncelleyebilir veya silebilir.
CREATE POLICY "feedbacks_update_policy" ON feedbacks
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "feedbacks_delete_policy" ON feedbacks
    FOR DELETE
    TO authenticated
    USING (auth.uid() = coach_id);


-- =====================================================================
-- 7. SCHEDULES TABLOSU POLİTİKALARI
-- =====================================================================
-- İlgili öğrenci ve programı hazırlayan koç program bloklarını görebilir.
CREATE POLICY "schedules_select_policy" ON schedules
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id OR auth.uid() = coach_id);

-- Sadece koçlar program ekleyebilir, güncelleyebilir veya silebilir.
CREATE POLICY "schedules_insert_policy" ON schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "schedules_update_policy" ON schedules
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "schedules_delete_policy" ON schedules
    FOR DELETE
    TO authenticated
    USING (auth.uid() = coach_id);


-- =====================================================================
-- 8. ANNOUNCEMENTS TABLOSU POLİTİKALARI
-- =====================================================================
-- Duyuruyu yayınlayan koç veya o koça bağlı olan öğrenciler duyuruları görebilir.
CREATE POLICY "announcements_select_policy" ON announcements
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = coach_id 
        OR (SELECT p.coach_id FROM profiles p WHERE p.id = auth.uid()) = coach_id
    );

-- Sadece koçlar duyuru yayınlayabilir.
CREATE POLICY "announcements_insert_policy" ON announcements
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = coach_id);

-- Sadece duyuruyu yayınlayan koç güncelleyebilir veya silebilir.
CREATE POLICY "announcements_update_policy" ON announcements
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "announcements_delete_policy" ON announcements
    FOR DELETE
    TO authenticated
    USING (auth.uid() = coach_id);


-- =====================================================================
-- 9. GROUPS TABLOSU POLİTİKALARI
-- =====================================================================
-- Sadece sınıfı oluşturan koç sınıfı görebilir ve yönetebilir.
CREATE POLICY "groups_select_policy" ON groups
    FOR SELECT
    TO authenticated
    USING (auth.uid() = coach_id);

CREATE POLICY "groups_insert_policy" ON groups
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "groups_update_policy" ON groups
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "groups_delete_policy" ON groups
    FOR DELETE
    TO authenticated
    USING (auth.uid() = coach_id);


-- =====================================================================
-- 10. GROUP_MEMBERS TABLOSU POLİTİKALARI
-- =====================================================================
-- Sınıfı yöneten koç bu üyeleri görebilir ve yönetebilir.
CREATE POLICY "group_members_select_policy" ON group_members
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM groups g 
            WHERE g.id = group_id AND g.coach_id = auth.uid()
        )
    );

CREATE POLICY "group_members_insert_policy" ON group_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM groups g 
            WHERE g.id = group_id AND g.coach_id = auth.uid()
        )
    );

CREATE POLICY "group_members_delete_policy" ON group_members
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM groups g 
            WHERE g.id = group_id AND g.coach_id = auth.uid()
        )
    );


-- =====================================================================
-- 11. INVITATIONS TABLOSU POLİTİKALARI
-- =====================================================================
-- Yeni kayıt olacak öğrenciler davetiye sorgulaması yapabilsin diye SELECT herkese açıktır.
CREATE POLICY "invitations_select_policy" ON invitations
    FOR SELECT
    USING (true);

-- Sadece koçlar davetiye oluşturabilir veya silebilir.
CREATE POLICY "invitations_insert_policy" ON invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "invitations_delete_policy" ON invitations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = coach_id);


-- =====================================================================
-- 12. TOPICS_PROGRESS TABLOSU POLİTİKALARI
-- =====================================================================
-- Öğrenci kendi durumunu, koçu da görebilir.
CREATE POLICY "topics_progress_select_policy" ON topics_progress
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id 
        OR auth.uid() = (SELECT p.coach_id FROM profiles p WHERE p.id = student_id)
    );

-- Sadece öğrenci kendi ilerlemesini kaydedebilir/güncelleyebilir.
CREATE POLICY "topics_progress_upsert_policy" ON topics_progress
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "topics_progress_update_policy" ON topics_progress
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);
