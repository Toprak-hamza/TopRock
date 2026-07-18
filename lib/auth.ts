import { supabase } from './supabase';
import { sanitizeText } from './utils';

export type Role = 'student' | 'coach';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string; // Not used over wire much, but keeping for type compat
  coachId?: string;
}

export interface Group {
  id: string;
  name: string;
  coachId: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  studentId: string;
  joinedAt: string;
}

export interface Announcement {
  id: string;
  coachId: string;
  title: string;
  content: string;
  targetGroupIds: string[];
  createdAt: string;
}

export interface Invitation {
  code: string;
  coachId: string;
  studentName: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  studentId?: string;
}

export interface Homework {
  id: string;
  studentId: string;
  coachId: string;
  subject: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  correctCount?: number;
  incorrectCount?: number;
  emptyCount?: number;
  questionCount?: number;
  createdAt: string;
}

export interface LibraryBook {
  id: string;
  name: string;
  grade_level?: string;
  publisher?: string;
}

export interface LibraryTopic {
  id: string;
  book_id: string;
  name: string;
  page_range?: string;
}

export interface Feedback {
  id: string;
  studentId: string;
  coachId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ScheduleBlock {
  id: string;
  studentId: string;
  coachId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
}

export interface TopicProgress {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  status: 'not_started' | 'in_progress' | 'completed';
  yieldRate: 'low' | 'medium' | 'high';
}

export interface CurriculumSubject {
  id: string;
  name: string;
  topics: string[];
}

export interface ExamSubjectScore {
  subject: string;
  correct: number;
  incorrect: number;
  empty?: number;
  net: number;
}

export interface ExamDetail {
  id: string;
  studentId: string;
  examType: string;
  title: string;
  date: string; // YYYY-MM-DD
  overallNet: number;
  subjectScores: ExamSubjectScore[];
  coachNote?: string;
}

export interface StudySession {
  id: string;
  studentId: string;
  durationMinutes: number;
  subjectId?: string;
  createdAt: string;
}

// ----------------------------------------------------
// DTO Mappings: DB (snake_case) <-> Frontend (camelCase)
// ----------------------------------------------------

export function mapProfileToUser(p: any): User {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    coachId: p.coach_id,
  };
}

export function mapGroup(g: any): Group {
  return {
    id: g.id,
    name: g.name,
    coachId: g.coach_id,
    createdAt: g.created_at,
  };
}

export function mapGroupMember(gm: any): GroupMember {
  return {
    id: gm.id,
    groupId: gm.group_id,
    studentId: gm.student_id,
    joinedAt: gm.joined_at,
  };
}

export function mapAnnouncement(a: any): Announcement {
  return {
    id: a.id,
    coachId: a.coach_id,
    title: a.title,
    content: a.content,
    targetGroupIds: a.target_group_ids || [],
    createdAt: a.created_at,
  };
}

export function mapInvitation(i: any): Invitation {
  return {
    code: i.code,
    coachId: i.coach_id,
    studentName: i.student_name,
    status: i.status,
    createdAt: i.created_at,
    studentId: i.student_id,
  };
}

export function mapHomework(h: any): Homework {
  return {
    id: h.id,
    studentId: h.student_id,
    coachId: h.coach_id,
    subject: h.subject,
    description: h.description,
    dueDate: h.due_date,
    priority: h.priority,
    completed: h.completed,
    correctCount: h.correct_count,
    incorrectCount: h.incorrect_count,
    emptyCount: h.empty_count,
    questionCount: h.question_count,
    createdAt: h.created_at,
  };
}

export function mapFeedback(f: any): Feedback {
  return {
    id: f.id,
    studentId: f.student_id,
    coachId: f.coach_id,
    content: f.content,
    isRead: f.is_read,
    createdAt: f.created_at,
  };
}

export function mapSchedule(s: any): ScheduleBlock {
  return {
    id: s.id,
    studentId: s.student_id,
    coachId: s.coach_id,
    dayOfWeek: s.day_of_week,
    startTime: s.start_time,
    endTime: s.end_time,
    title: s.title,
    color: s.color,
  };
}

export function mapTopicProgress(t: any): TopicProgress {
  return {
    id: t.id,
    studentId: t.student_id,
    subject: t.subject,
    topic: t.topic,
    status: t.status,
    yieldRate: t.yield_rate,
  };
}

export function mapExam(e: any): ExamDetail {
  return {
    id: e.id,
    studentId: e.student_id,
    examType: e.exam_type || "TYT",
    title: e.title || "Deneme Sınavı",
    date: e.date,
    overallNet: e.overall_net,
    subjectScores: e.subject_scores || [],
    coachNote: e.coach_note,
  };
}

export function mapStudySession(s: any): StudySession {
  return {
    id: s.id,
    studentId: s.student_id,
    durationMinutes: s.duration_minutes,
    subjectId: s.subject_id,
    createdAt: s.created_at,
  };
}

// ----------------------------------------------------
// Authentication & User Data
// ----------------------------------------------------

// Dummy initialization for retro-compatibility (no op)
export function initializeStorage() {
  console.log('Supabase Mode: Initializing logic skipped');
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile) return null;
  return mapProfileToUser(profile);
}

// Kept synchronous placeholder initially, but components should use Auth hooks
export function logout() {
  supabase.auth.signOut();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('bitigedu_auth_change'));
}

export async function getUsers(): Promise<User[]> {
  const { data } = await supabase.from('profiles').select('*');
  return (data || []).map(mapProfileToUser);
}

// ----------------------------------------------------
// Supabase Data Fetchers
// ----------------------------------------------------

export async function getInvitations(): Promise<Invitation[]> {
  const { data } = await supabase.from('invitations').select('*');
  return (data || []).map(mapInvitation);
}

export async function createInvitation(inv: Partial<Invitation>) {
  await supabase.from('invitations').insert({
    code: inv.code,
    coach_id: inv.coachId,
    student_name: sanitizeText(inv.studentName),
    status: 'pending',
  });
}

export async function updateInvitationStatus(code: string, studentId: string) {
  await supabase.from('invitations').update({ status: 'accepted', student_id: studentId }).eq('code', code);
}

export async function deletePendingInvitation(code: string) {
  const { error } = await supabase.from('invitations').delete().eq('code', code).eq('status', 'pending');
  if (error) {
    console.error("deletePendingInvitation error:", error);
    throw error;
  }
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BE-${result}`;
}

export async function getHomeworks(studentId?: string, coachId?: string): Promise<Homework[]> {
  let query = supabase.from('homeworks').select('*');
  if (studentId) {
    query = query.eq('student_id', studentId);
  }
  if (coachId) {
    query = query.eq('coach_id', coachId);
  }
  const { data } = await query.order('created_at', { ascending: false });
  return (data || []).map(mapHomework);
}

export async function saveHomework(hw: Partial<Homework>) {
  const cleanSubject = sanitizeText(hw.subject);
  const cleanDescription = sanitizeText(hw.description);
  // If id is provided, update
  if (hw.id && hw.id !== '' && !hw.id.startsWith('new_')) {
    await supabase.from('homeworks').update({
      subject: cleanSubject,
      description: cleanDescription,
      due_date: hw.dueDate,
      priority: hw.priority,
      completed: hw.completed,
      question_count: hw.questionCount,
    }).eq('id', hw.id);
  } else {
    // Insert
    await supabase.from('homeworks').insert({
      student_id: hw.studentId,
      coach_id: hw.coachId,
      subject: cleanSubject,
      description: cleanDescription,
      due_date: hw.dueDate,
      priority: hw.priority,
      question_count: hw.questionCount,
      completed: false
    });

    // Trigger notification
    await supabase.from('notifications').insert({
      user_id: hw.studentId,
      student_id: hw.studentId,
      title: 'Yeni Ödev Atandı',
      message: `Koçunuz size ${cleanSubject} dersinden yeni bir ödev verdi: ${cleanDescription}`,
      type: 'homework',
      link: '/dashboard'
    });
  }
}

export async function updateHomeworkStatus(id: string, completed: boolean) {
  const { data: hw } = await supabase.from('homeworks').select('student_id, coach_id, subject, completed').eq('id', id).single();
  
  if (!completed) {
    await supabase.from('homeworks').update({ completed, correct_count: null, incorrect_count: null, empty_count: null }).eq('id', id);
  } else {
    await supabase.from('homeworks').update({ completed }).eq('id', id);
    if (hw && !hw.completed) {
      await awardStudentXP(hw.student_id, 50);

      // Trigger notification to coach
      if (hw.coach_id) {
        try {
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', hw.student_id)
            .single();
          const studentName = studentProfile?.name || 'Bir öğrenci';

          await supabase.from('notifications').insert({
            user_id: hw.coach_id,
            student_id: hw.student_id,
            title: `${studentName} Ödevini Tamamladı`,
            message: `${studentName}, '${hw.subject}' ödevini tamamladı.`,
            type: 'homework_completed',
            link: `/coach/student/${hw.student_id}`
          });
        } catch (e) {
          console.error("Error creating homework completion notification:", e);
        }
      }
    }
  }
}

export async function updateHomeworkAnalysis(id: string, correct: number, incorrect: number, empty: number) {
  const { data: hw } = await supabase.from('homeworks').select('student_id, coach_id, subject, completed').eq('id', id).single();

  const { error } = await supabase.from('homeworks').update({ 
    completed: true,
    correct_count: correct,
    incorrect_count: incorrect,
    empty_count: empty
  }).eq('id', id);

  if (error) {
    console.error("updateHomeworkAnalysis err:", error);
    throw error;
  }

  if (hw && !hw.completed) {
    await awardStudentXP(hw.student_id, 50);

    // Trigger notification to coach
    if (hw.coach_id) {
      try {
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', hw.student_id)
          .single();
        const studentName = studentProfile?.name || 'Bir öğrenci';

        await supabase.from('notifications').insert({
          user_id: hw.coach_id,
          student_id: hw.student_id,
          title: `${studentName} Ödev Analizini Girdi`,
          message: `${studentName}, '${hw.subject}' ödevinin analizini girdi: ${correct} Doğru, ${incorrect} Yanlış, ${empty} Boş.`,
          type: 'homework_completed',
          link: `/coach/student/${hw.student_id}`
        });
      } catch (e) {
        console.error("Error creating homework analysis notification:", e);
      }
    }
  }
}

export async function getLibraryBooks(): Promise<LibraryBook[]> {
  const { data } = await supabase.from('library_books').select('*').order('name', { ascending: true });
  return data || [];
}

export async function getLibraryTopics(bookId: string): Promise<LibraryTopic[]> {
  const { data } = await supabase.from('library_topics').select('*').eq('book_id', bookId).order('name', { ascending: true });
  return data || [];
}

export async function getFeedbacks(studentId?: string): Promise<Feedback[]> {
  let query = supabase.from('feedbacks').select('*');
  if (studentId) {
    query = query.eq('student_id', studentId);
  }
  const { data } = await query.order('created_at', { ascending: false });
  return (data || []).map(mapFeedback);
}

export async function saveFeedback(fb: Partial<Feedback>) {
  const cleanContent = sanitizeText(fb.content);
  await supabase.from('feedbacks').insert({
    student_id: fb.studentId,
    coach_id: fb.coachId,
    content: cleanContent,
    is_read: false
  });
}

export async function getSchedules(studentId?: string): Promise<ScheduleBlock[]> {
  let query = supabase.from('schedules').select('*');
  if (studentId) {
    query = query.eq('student_id', studentId);
  }
  const { data } = await query;
  return (data || []).map(mapSchedule);
}

export async function saveSchedulesConfig(schedules: ScheduleBlock[], coachId: string, studentId: string) {
  // Simplistic sync: delete existing for this student-coach pair, insert new ones
  await supabase.from('schedules').delete().eq('student_id', studentId).eq('coach_id', coachId);
  const insertData = schedules.map(s => ({
    student_id: s.studentId,
    coach_id: s.coachId,
    day_of_week: s.dayOfWeek,
    start_time: s.startTime,
    end_time: s.endTime,
    title: s.title,
    color: s.color,
  }));
  if (insertData.length > 0) {
    await supabase.from('schedules').insert(insertData);
  }
}

export async function getTopics(studentId?: string): Promise<TopicProgress[]> {
  let query = supabase.from('topics_progress').select('*');
  if (studentId) {
    query = query.eq('student_id', studentId);
  }
  const { data } = await query;
  return (data || []).map(mapTopicProgress);
}

export async function saveTopicProgress(progress: Partial<TopicProgress>) {
  if (progress.id && !progress.id.startsWith('new_')) {
    await supabase.from('topics_progress').update({
      status: progress.status,
      yield_rate: progress.yieldRate,
      updated_at: new Date().toISOString()
    }).eq('id', progress.id);
  } else {
    await supabase.from('topics_progress').insert({
      student_id: progress.studentId,
      subject: progress.subject,
      topic: progress.topic,
      status: progress.status,
      yield_rate: progress.yieldRate
    });
  }
}

export async function getDetailedExams(studentId?: string): Promise<ExamDetail[]> {
  let query = supabase.from('exams').select('*');
  if (studentId) {
    query = query.eq('student_id', studentId);
  }
  const { data } = await query.order('date', { ascending: false });
  return (data || []).map(mapExam);
}

export async function saveExam(exam: Partial<ExamDetail>) {
  await supabase.from('exams').insert({
    student_id: exam.studentId,
    exam_type: exam.examType,
    title: sanitizeText(exam.title),
    date: exam.date,
    overall_net: exam.overallNet,
    subject_scores: exam.subjectScores,
  });
}

export async function updateCoachNote(examId: string, note: string) {
  const cleanNote = sanitizeText(note);
  const { error } = await supabase
    .from("exams")
    .update({ coach_note: cleanNote })
    .eq("id", examId);
    
  if (error) {
    console.error("updateCoachNote err:", error);
    throw error;
  }
}

// ================= STUDY SESSIONS ==================

export async function getStudySessions(): Promise<StudySession[]> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getStudySessions ERROR DETAILS:", JSON.stringify(error, null, 2));
    throw new Error(`Pomodoro verileri çekilemedi: ${error.message} (${error.code})`);
  }
  return data.map(mapStudySession);
}

export async function saveStudySession(studentId: string, durationMinutes: number, subjectId?: string) {
  const payload: any = {
    student_id: studentId,
    duration_minutes: durationMinutes,
  };
  if (subjectId) {
    payload.subject_id = subjectId;
  }
  
  const { error } = await supabase.from("study_sessions").insert([payload]);

  if (error) {
    console.error("saveStudySession err:", error);
    throw error;
  }

  await awardStudentXP(studentId, 20);
}

export async function getCurriculum(): Promise<CurriculumSubject[]> {
  const { data } = await supabase.from('curriculum_subjects').select('*');
  if (!data || data.length === 0) return [];
  return data.map(d => ({
    id: d.id,
    name: d.name,
    topics: typeof d.topics === 'string' ? JSON.parse(d.topics) : d.topics
  }));
}

export async function saveCurriculum(curriculum: CurriculumSubject[]) {
  // Upsert all
  const payloads = curriculum.map(c => ({
    id: c.id,
    name: c.name,
    topics: JSON.stringify(c.topics)
  }));
  await supabase.from('curriculum_subjects').upsert(payloads);
}

export async function getStudentCurriculumProgress(studentId: string): Promise<number> {
  try {
    const curriculum = await getCurriculum();
    let totalTopics = 0;
    curriculum.forEach(sub => {
      if (Array.isArray(sub.topics)) {
        totalTopics += sub.topics.length;
      }
    });

    if (totalTopics === 0) return 0;
    const maxPoints = totalTopics * 6; // 3 steps (study, solve, review) * 2 points max per step

    const { data: tpData, error } = await supabase
      .from('topics_progress')
      .select('*')
      .eq('student_id', studentId);

    if (error || !tpData || tpData.length === 0) return 0;

    let earnedPoints = 0;
    tpData.forEach(row => {
      const states = typeof row.states === 'string' ? JSON.parse(row.states) : row.states;
      if (states) {
        earnedPoints += (Number(states.study) || 0) + (Number(states.solve) || 0) + (Number(states.review) || 0);
      }
    });

    return Math.min(100, Math.round((earnedPoints / maxPoints) * 100));
  } catch (e) {
    console.error("Error calculating student curriculum progress:", e);
    return 0;
  }
}

export async function deleteStudentCascading(studentId: string) {
  // Wait, RPC edge function would be better, but for now we just delete from profiles
  // RLS cascading constraints in DB handle homeworks, exams, etc.
  await supabase.from('profiles').delete().eq('id', studentId);
}

// ----------------------------------------------------
// Group Management
// ----------------------------------------------------

export async function getGroups(): Promise<Group[]> {
  const { data } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
  return (data || []).map(mapGroup);
}

export async function createGroup(name: string, coachId: string) {
  await supabase.from('groups').insert({ name: sanitizeText(name), coach_id: coachId });
}

export async function deleteGroup(id: string) {
  await supabase.from('groups').delete().eq('id', id);
}

export async function getGroupMembers(): Promise<GroupMember[]> {
  const { data } = await supabase.from('group_members').select('*');
  return (data || []).map(mapGroupMember);
}

export async function updateGroupMembers(groupId: string, studentIds: string[]) {
  // Clear existing members of the group
  await supabase.from('group_members').delete().eq('group_id', groupId);
  
  if (studentIds.length > 0) {
    const insertData = studentIds.map(sid => ({
      group_id: groupId,
      student_id: sid
    }));
    await supabase.from('group_members').insert(insertData);
  }
}

// ----------------------------------------------------
// Announcements Management
// ----------------------------------------------------

export async function getAnnouncements(): Promise<Announcement[]> {
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  return (data || []).map(mapAnnouncement);
}

export async function createAnnouncement(ann: Partial<Announcement>) {
  await supabase.from('announcements').insert({
    coach_id: ann.coachId,
    title: sanitizeText(ann.title),
    content: sanitizeText(ann.content),
    target_group_ids: ann.targetGroupIds,
  });
}

// ----------------------------------------------------
// Gamification & Badges
// ----------------------------------------------------

export interface StudentGamification {
  studentId: string;
  totalXp: number;
  currentLevel: number;
  createdAt: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  createdAt: string;
}

export interface StudentBadge {
  id: string;
  studentId: string;
  badgeId: string;
  earnedAt: string;
}

export function mapGamification(g: any): StudentGamification {
  return {
    studentId: g.student_id,
    totalXp: g.total_xp || 0,
    currentLevel: g.current_level || 1,
    createdAt: g.created_at,
  };
}

export function mapBadge(b: any): Badge {
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    iconName: b.icon_name,
    createdAt: b.created_at,
  };
}

export async function awardStudentXP(studentId: string, amount: number) {
  const { data: current, error: fetchError } = await supabase
    .from('student_gamification')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching student_gamification:", fetchError);
    return;
  }

  if (current) {
    const newXp = (current.total_xp || 0) + amount;
    const newLevel = Math.floor(newXp / 1000) + 1;
    const { error: updateError } = await supabase
      .from('student_gamification')
      .update({
        total_xp: newXp,
        current_level: newLevel
      })
      .eq('student_id', studentId);

    if (updateError) {
      console.error("Error updating student_gamification:", updateError);
    }
  } else {
    const newLevel = Math.floor(amount / 1000) + 1;
    const { error: insertError } = await supabase
      .from('student_gamification')
      .insert({
        student_id: studentId,
        total_xp: amount,
        current_level: newLevel
      });

    if (insertError) {
      console.error("Error inserting student_gamification:", insertError);
    }
  }
}

export async function getStudentGamification(studentId: string): Promise<StudentGamification> {
  const { data, error } = await supabase
    .from('student_gamification')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    console.error("Error in getStudentGamification:", error);
    throw error;
  }
  if (!data) {
    return { studentId, totalXp: 0, currentLevel: 1, createdAt: new Date().toISOString() };
  }
  return mapGamification(data);
}

export async function getLeaderboard(): Promise<any[]> {
  const { data: profiles, error: errProf } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'student');

  if (errProf) {
    console.error("Error in getLeaderboard profiles:", errProf);
    throw errProf;
  }

  const { data: gamifications, error: errGam } = await supabase
    .from('student_gamification')
    .select('*');

  if (errGam) {
    console.error("Error in getLeaderboard gamifications:", errGam);
    throw errGam;
  }

  const leaderboard = (profiles || []).map(p => {
    const gam = (gamifications || []).find(g => g.student_id === p.id);
    return {
      id: p.id,
      name: p.name || p.email.split('@')[0],
      email: p.email,
      xp: gam ? gam.total_xp : 0,
      level: gam ? gam.current_level : 1
    };
  });

  return leaderboard.sort((a, b) => b.xp - a.xp);
}

export async function getBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error in getBadges:", error);
    throw error;
  }
  return (data || []).map(mapBadge);
}

export async function getStudentBadges(studentId: string): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('student_badges')
    .select('badge_id, badges(*)')
    .eq('student_id', studentId);

  if (error) {
    console.error("Error in getStudentBadges:", error);
    throw error;
  }
  return (data || [])
    .filter(sb => sb.badges !== null)
    .map(sb => mapBadge(sb.badges));
}

export async function awardBadge(studentId: string, badgeId: string) {
  const { data: existing } = await supabase
    .from('student_badges')
    .select('id')
    .eq('student_id', studentId)
    .eq('badge_id', badgeId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from('student_badges').insert({
      student_id: studentId,
      badge_id: badgeId
    });
    if (error) {
      console.error("Error awarding badge:", error);
      throw error;
    }

    // Trigger notification
    try {
      const { data: badge } = await supabase
        .from('badges')
        .select('title')
        .eq('id', badgeId)
        .maybeSingle();
      
      if (badge) {
        await supabase.from('notifications').insert({
          user_id: studentId,
          student_id: studentId,
          title: 'Tebrikler! Yeni Rozet',
          message: `Koçunuz size '${badge.title}' rozetini atadı!`,
          type: 'badge',
          link: '/dashboard'
        });
      }
    } catch (e) {
      console.error("Error creating badge notification:", e);
    }
  }
}

export async function revokeBadge(studentId: string, badgeId: string) {
  const { error } = await supabase
    .from('student_badges')
    .delete()
    .eq('student_id', studentId)
    .eq('badge_id', badgeId);

  if (error) {
    console.error("Error revoking badge:", error);
    throw error;
  }
}

// ================= NOTIFICATIONS & BOOK TRACKER ==================

export interface Notification {
  id: string;
  userId: string;
  studentId?: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  link?: string;
  createdAt: string;
}

export interface Book {
  id: string;
  studentId: string;
  title: string;
  subject: string;
  totalItems: number;
  completedItems: number;
  targetDate: string;
  createdAt: string;
}

export function mapNotification(n: any): Notification {
  return {
    id: n.id,
    userId: n.user_id,
    studentId: n.student_id || undefined,
    title: n.title,
    message: n.message,
    isRead: n.is_read,
    type: n.type,
    link: n.link || undefined,
    createdAt: n.created_at,
  };
}

export function mapBook(b: any): Book {
  return {
    id: b.id,
    studentId: b.student_id,
    title: b.title,
    subject: b.subject,
    totalItems: b.total_items,
    completedItems: b.completed_items,
    targetDate: b.target_date,
    createdAt: b.created_at,
  };
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("getNotifications error:", error);
    throw error;
  }
  return (data || []).map(mapNotification);
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error("markNotificationAsRead error:", error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);

  if (error) {
    console.error("markAllNotificationsAsRead error:", error);
    throw error;
  }
}

export async function sendCoachMessage(studentId: string, coachId: string, message: string) {
  const cleanMessage = sanitizeText(message);
  
  let studentName = 'Bir öğrenci';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', studentId)
      .single();
    if (profile?.name) {
      studentName = profile.name;
    }
  } catch (err) {
    console.error("Error fetching student profile for notification:", err);
  }
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: coachId,
      student_id: studentId,
      title: `${studentName} Yeni Bir Koç Notu İletti`,
      message: `${studentName} yeni bir koç notu iletti: "${cleanMessage}"`,
      type: 'student_message',
      link: `/coach/student/${studentId}`
    });

  if (error) {
    console.error("sendCoachMessage error:", error);
    throw error;
  }
}

export async function getBooks(studentId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('book_tracker')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("getBooks error:", error);
    throw error;
  }
  return (data || []).map(mapBook);
}

export async function addBook(book: Partial<Book>) {
  const cleanTitle = sanitizeText(book.title || '');
  const cleanSubject = sanitizeText(book.subject || '');
  
  const { error } = await supabase
    .from('book_tracker')
    .insert({
      student_id: book.studentId,
      title: cleanTitle,
      subject: cleanSubject,
      total_items: book.totalItems,
      completed_items: book.completedItems || 0,
      target_date: book.targetDate,
    });

  if (error) {
    console.error("addBook error:", error);
    throw error;
  }
}

export async function updateBookProgress(bookId: string, completedItems: number) {
  const { error } = await supabase
    .from('book_tracker')
    .update({ completed_items: completedItems })
    .eq('id', bookId);

  if (error) {
    console.error("updateBookProgress error:", error);
    throw error;
  }
}

export async function deleteBook(bookId: string) {
  const { error } = await supabase
    .from('book_tracker')
    .delete()
    .eq('id', bookId);

  if (error) {
    console.error("deleteBook error:", error);
    throw error;
  }
}

export interface WeeklyProgram {
  id: string;
  studentId: string;
  coachId: string;
  weekStartDate: string;
  createdAt: string;
}

export interface DailyTask {
  id: string;
  programId: string;
  dayOfWeek: number;
  subject: string;
  description: string;
  targetQuestions: number;
  targetDuration: number;
  isCompleted: boolean;
  sourceBook?: string;
  subTopic?: string;
  pageRange?: string;
  coachNote?: string;
}

export async function getWeeklyProgram(studentId: string, weekStartDate: string): Promise<WeeklyProgram | null> {
  const { data, error } = await supabase
    .from('weekly_programs')
    .select('*')
    .eq('student_id', studentId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (error) {
    console.error("getWeeklyProgram error:", error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    studentId: data.student_id,
    coachId: data.coach_id,
    weekStartDate: data.week_start_date,
    createdAt: data.created_at,
  };
}

export async function getOrCreateWeeklyProgram(studentId: string, coachId: string, weekStartDate: string): Promise<WeeklyProgram> {
  const { data: existing } = await supabase
    .from('weekly_programs')
    .select('*')
    .eq('student_id', studentId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      studentId: existing.student_id,
      coachId: existing.coach_id,
      weekStartDate: existing.week_start_date,
      createdAt: existing.created_at,
    };
  }

  const { data: created, error: insertError } = await supabase
    .from('weekly_programs')
    .insert({
      student_id: studentId,
      coach_id: coachId,
      week_start_date: weekStartDate
    })
    .select()
    .single();

  if (insertError) {
    console.error("getOrCreateWeeklyProgram error:", insertError);
    throw insertError;
  }

  return {
    id: created.id,
    studentId: created.student_id,
    coachId: created.coach_id,
    weekStartDate: created.week_start_date,
    createdAt: created.created_at,
  };
}

export async function getDailyTasks(programId: string): Promise<DailyTask[]> {
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('program_id', programId)
    .order('id', { ascending: true });

  if (error) {
    console.error("getDailyTasks error:", error);
    throw error;
  }

  return (data || []).map(d => ({
    id: d.id,
    programId: d.program_id,
    dayOfWeek: d.day_of_week,
    subject: d.subject,
    description: d.description,
    targetQuestions: d.target_questions,
    targetDuration: d.target_duration,
    isCompleted: d.is_completed,
    sourceBook: d.source_book,
    subTopic: d.sub_topic,
    pageRange: d.page_range,
    coachNote: d.coach_note,
  }));
}

export async function saveDailyTask(task: Partial<DailyTask>) {
  const cleanSubject = sanitizeText(task.subject || '');
  const cleanDescription = sanitizeText(task.description || '');
  const cleanSourceBook = sanitizeText(task.sourceBook || '');
  const cleanSubTopic = sanitizeText(task.subTopic || '');
  const cleanPageRange = sanitizeText(task.pageRange || '');
  const cleanCoachNote = sanitizeText(task.coachNote || '');

  const payload = {
    program_id: task.programId,
    day_of_week: task.dayOfWeek,
    subject: cleanSubject,
    description: cleanDescription,
    target_questions: task.targetQuestions || 0,
    target_duration: task.targetDuration || 0,
    is_completed: task.isCompleted || false,
    source_book: cleanSourceBook,
    sub_topic: cleanSubTopic,
    page_range: cleanPageRange,
    coach_note: cleanCoachNote
  };

  if (task.id) {
    const { error } = await supabase
      .from('daily_tasks')
      .update(payload)
      .eq('id', task.id);
    if (error) {
      console.error("saveDailyTask update error:", error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('daily_tasks')
      .insert(payload);
    if (error) {
      console.error("saveDailyTask insert error:", error);
      throw error;
    }
  }
}

export async function deleteDailyTask(taskId: string) {
  const { error } = await supabase
    .from('daily_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error("deleteDailyTask error:", error);
    throw error;
  }
}

export async function updateTaskCompletion(taskId: string, isCompleted: boolean) {
  const { error } = await supabase
    .from('daily_tasks')
    .update({ is_completed: isCompleted })
    .eq('id', taskId);

  if (error) {
    console.error("updateTaskCompletion error:", error);
    throw error;
  }

  // Trigger notification to coach when completed
  if (isCompleted) {
    try {
      const { data: task } = await supabase
        .from('daily_tasks')
        .select('program_id, subject, description')
        .eq('id', taskId)
        .single();

      if (task) {
        const { data: program } = await supabase
          .from('weekly_programs')
          .select('student_id, coach_id')
          .eq('id', task.program_id)
          .single();

        if (program && program.coach_id) {
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', program.student_id)
            .single();

          const studentName = studentProfile?.name || 'Bir öğrenci';

          await supabase.from('notifications').insert({
            user_id: program.coach_id,
            student_id: program.student_id,
            title: `${studentName} Bir Görevi Tamamladı`,
            message: `${studentName}, '${task.subject}' dersinin '${task.description}' görevini tamamladı.`,
            type: 'task_completed',
            link: `/coach/student/${program.student_id}`
          });
        }
      }
    } catch (e) {
      console.error("Error creating task completion notification:", e);
    }
  }
}

// ----------------------------------------------------
// Hazır Şablon Planlar (Study Plan Templates)
// ----------------------------------------------------

export interface TemplateTaskItem {
  dayOfWeek: number; // 1 (Pzt) .. 7 (Paz)
  subject: string;
  description: string;
  targetQuestions: number;
  targetDuration: number;
  sourceBook?: string;
  subTopic?: string;
  pageRange?: string;
  coachNote?: string;
}

export interface StudyPlanTemplate {
  id: string;
  coachId: string;
  title: string;
  description: string;
  scheduleData: TemplateTaskItem[];
  createdAt: string;
  updatedAt?: string;
}

export function mapStudyPlanTemplate(t: any): StudyPlanTemplate {
  return {
    id: t.id,
    coachId: t.coach_id,
    title: t.title,
    description: t.description || '',
    scheduleData: typeof t.schedule_data === 'string' ? JSON.parse(t.schedule_data) : (t.schedule_data || []),
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function getStudyPlanTemplates(coachId: string): Promise<StudyPlanTemplate[]> {
  const { data, error } = await supabase
    .from('study_plan_templates')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("getStudyPlanTemplates error:", error);
    throw error;
  }
  return (data || []).map(mapStudyPlanTemplate);
}

export async function saveStudyPlanTemplate(template: Partial<StudyPlanTemplate>): Promise<StudyPlanTemplate> {
  const cleanTitle = sanitizeText(template.title || '');
  const cleanDescription = sanitizeText(template.description || '');

  const payload = {
    coach_id: template.coachId,
    title: cleanTitle,
    description: cleanDescription,
    schedule_data: template.scheduleData || [],
    updated_at: new Date().toISOString()
  };

  if (template.id && !template.id.startsWith('new_')) {
    const { data, error } = await supabase
      .from('study_plan_templates')
      .update(payload)
      .eq('id', template.id)
      .select()
      .single();

    if (error) {
      console.error("saveStudyPlanTemplate update error:", error);
      throw error;
    }
    return mapStudyPlanTemplate(data);
  } else {
    const { data, error } = await supabase
      .from('study_plan_templates')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("saveStudyPlanTemplate insert error:", error);
      throw error;
    }
    return mapStudyPlanTemplate(data);
  }
}

export async function deleteStudyPlanTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('study_plan_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("deleteStudyPlanTemplate error:", error);
    throw error;
  }
}

export async function applyTemplateToStudent(
  templateId: string,
  studentId: string,
  coachId: string,
  weekStartDate: string,
  clearExisting: boolean = false
): Promise<void> {
  // 1. Fetch template
  const { data: tData, error: tErr } = await supabase
    .from('study_plan_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (tErr || !tData) {
    throw new Error("Şablon bulunamadı.");
  }

  const template = mapStudyPlanTemplate(tData);

  // 2. Get or create student's weekly program
  const program = await getOrCreateWeeklyProgram(studentId, coachId, weekStartDate);

  // 3. Clear existing tasks if requested
  if (clearExisting) {
    await supabase.from('daily_tasks').delete().eq('program_id', program.id);
  }

  // 4. Batch insert template tasks into student's daily_tasks
  if (template.scheduleData && template.scheduleData.length > 0) {
    const taskInsertPayloads = template.scheduleData.map(item => ({
      program_id: program.id,
      day_of_week: item.dayOfWeek,
      subject: sanitizeText(item.subject),
      description: sanitizeText(item.description),
      target_questions: item.targetQuestions || 0,
      target_duration: item.targetDuration || 0,
      is_completed: false,
      source_book: sanitizeText(item.sourceBook || ''),
      sub_topic: sanitizeText(item.subTopic || ''),
      page_range: sanitizeText(item.pageRange || ''),
      coach_note: sanitizeText(item.coachNote || '')
    }));

    const { error: insertErr } = await supabase.from('daily_tasks').insert(taskInsertPayloads);
    if (insertErr) {
      console.error("applyTemplateToStudent task insert error:", insertErr);
      throw insertErr;
    }
  }

  // 5. Send notification to student
  try {
    await supabase.from('notifications').insert({
      user_id: studentId,
      student_id: studentId,
      title: 'Yeni Çalışma Programı Atandı',
      message: `Koçunuz size '${template.title}' şablon planını uygulayarak haftalık programınızı güncelledi.`,
      type: 'program',
      link: '/dashboard'
    });
  } catch (e) {
    console.error("Error creating program assignment notification:", e);
  }
}


