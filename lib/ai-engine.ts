import { getTopics, getDetailedExams, TopicProgress, ExamDetail } from "./auth";

export type InsightType = 'weak_link' | 'critical_path' | 'pacing';
export type InsightPriority = 'low' | 'medium' | 'high'; // low: blue, medium: orange,/amber, high: red

export interface AiInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  relatedSubject?: string;
}

export async function analyzeStudentData(studentId: string): Promise<AiInsight[]> {
  const insights: AiInsight[] = [];
  try {
    const topics = await getTopics(studentId) || [];
    
    const rawExams = await getDetailedExams(studentId) || [];
    const exams = rawExams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 1. Diagnostics: Weak Links (Hysteresis Error - False Confidence)
  // Logic: A topic is marked 'completed' in Subject X, but Subject X scores have dropped in the last two exams.
  if (exams.length >= 2) {
    const lastExam = exams[exams.length - 1];
    const prevExam = exams[exams.length - 2];

    const completedSubjects = Array.from(new Set(topics.filter(t => t.status === 'completed').map(t => t.subject)));
    
    for (const subject of completedSubjects) {
      const lastScore = lastExam.subjectScores.find(s => s.subject === subject)?.net;
      const prevScore = prevExam.subjectScores.find(s => s.subject === subject)?.net;

      if (lastScore !== undefined && prevScore !== undefined) {
        if (lastScore < prevScore) {
          // Flag as Weak Link
          insights.push({
            id: `wl_${subject}`,
            type: 'weak_link',
            priority: 'high',
            title: 'Yalancı Güven (Verimsiz Çalışma)',
            message: `Dikkat: ${subject} dersinde bazı konuları bitirdiğini belirttin ama netlerin son sınavlarda düşüşte. Bu hafta buraya "Acil Müdahale" yapmalısın.`,
            relatedSubject: subject
          });
        }
      }
    }
  }

  // 2. Diagnostics: Critical Path (Missed Opportunity)
  // Logic: High yield topic is 'not_started'
  const highYieldMissed = topics.filter(t => t.yieldRate === 'high' && t.status === 'not_started');
  for (const topic of highYieldMissed) {
    insights.push({
      id: `cp_${topic.id}`,
      type: 'critical_path',
      priority: 'medium', // Orange
      title: 'Kaçırılan Fırsat (Kritik Yol)',
      message: `Sınavda çıkma oranı çok yüksek olan ${topic.subject} - ${topic.topic} konusu henüz boş. Stratejik olarak buraya odaklanmalısın.`,
      relatedSubject: topic.subject
    });
  }

  // 3. Pacing: Speed Estimate
  // Logic: Based on total completed / total topics
  if (topics.length > 0) {
    const completedTopics = topics.filter(t => t.status === 'completed').length;
    const progressLimit = Math.round((completedTopics / topics.length) * 100);
    // Extrapolate a mock projection mapping speed 
    const projectedCompletion = Math.min(100, Math.round(progressLimit * 1.5)); // Just a mock math for "Estimated Completion %"

    let priority: InsightPriority = 'low';
    if (projectedCompletion < 70) priority = 'medium';
    if (projectedCompletion < 50) priority = 'high';

    insights.push({
      id: `pacing_est`,
      type: 'pacing',
      priority: priority,
      title: 'Hız Tahmini & Projeksiyon',
      message: `Mevcut konu bitirme hızına göre sınav gününe kadar müfredatın yaklaşık %${projectedCompletion}'lik kısmını bitirebileceğin öngörülüyor.`,
    });
  } else {
    // If no topic data exists, suggest creating some
    insights.push({
      id: `setup_required`,
      type: 'pacing',
      priority: 'low',
      title: 'Yapay Zeka Devrede',
      message: 'Sistemi analiz etmem için Konu Matrisi üzerinden çalışmaya başlamalısın.'
    });
  }

  return insights;
  } catch (e) {
    console.error("AI Insight error:", e);
    return insights;
  }
}
