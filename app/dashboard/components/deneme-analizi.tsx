"use client";

import { useState, useEffect } from "react";
import { Plus, BarChart3, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

type RawScore = { subject: string; net: number };

type TransformedData = {
  id: string;
  name: string;
  turkce: number;
  matematik: number;
  sosyal: number;
  fen: number;
};

export function DenemeAnalizi() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<TransformedData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [turkce, setTurkce] = useState("");
  const [matematik, setMatematik] = useState("");
  const [sosyal, setSosyal] = useState("");
  const [fen, setFen] = useState("");

  const loadData = async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      const { data: exams, error } = await supabase
        .from('exams')
        .select('*')
        .eq('student_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      if (exams && exams.length > 0) {
        const transformed: TransformedData[] = exams.map((ex, idx) => {
          const scores = (typeof ex.subject_scores === 'string' ? JSON.parse(ex.subject_scores) : ex.subject_scores) as RawScore[];
          const findNet = (sub: string) => scores.find(s => s.subject === sub)?.net || 0;
          return {
            id: ex.id,
            name: `Deneme ${idx + 1}`,
            turkce: findNet('Türkçe'),
            matematik: findNet('Matematik'),
            sosyal: findNet('Sosyal'),
            fen: findNet('Fen'),
          };
        });
        setData(transformed);
      } else {
        setData([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setIsDataLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Realtime for exams
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('exams_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams', filter: `student_id=eq.${user.id}` }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !turkce || !matematik || !sosyal || !fen) return;

    setIsSaving(true);
    const parsedTurkce = parseFloat(turkce);
    const parsedMat = parseFloat(matematik);
    const parsedSosyal = parseFloat(sosyal);
    const parsedFen = parseFloat(fen);
    
    // Overall is sum of these 4 conceptually for standard TR MSÜ/TYT structure mock
    const overallNet = parsedTurkce + parsedMat + parsedSosyal + parsedFen;
    const scores: RawScore[] = [
      { subject: 'Türkçe', net: parsedTurkce },
      { subject: 'Matematik', net: parsedMat },
      { subject: 'Sosyal', net: parsedSosyal },
      { subject: 'Fen', net: parsedFen },
    ];

    try {
      await supabase.from('exams').insert({
        student_id: user.id,
        date: new Date().toISOString().split('T')[0],
        overall_net: overallNet,
        subject_scores: scores // JSONB handles array natively via SDK
      });

      setTurkce("");
      setMatematik("");
      setSosyal("");
      setFen("");
      setIsFormOpen(false);
      // Let realtime subscription refetch or call loadData
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isDataLoading) {
    return (
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-3 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-3" />
          <span className="text-muted-foreground">Deneme Analizleri Yükleniyor...</span>
        </div>
      </section>
    );
  }

  const latestData = data.length > 0 ? data[data.length - 1] : { turkce: 0, matematik: 0, sosyal: 0, fen: 0 };
  const pieData = [
    { name: "Türkçe", value: latestData.turkce },
    { name: "Matematik", value: latestData.matematik },
    { name: "Sosyal", value: latestData.sosyal },
    { name: "Fen", value: latestData.fen },
  ].filter(item => item.value > 0);

  const PIE_COLORS = ["#f97316", "#8b5cf6", "#0ea5e9", "#10b981"];

  const chartData = data.slice(-5);

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-violet-400" />
            <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
              Deneme Net Gidişatı
            </h2>
          </div>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600/10 px-3 py-1.5 text-sm font-medium text-orange-500 transition-colors hover:bg-orange-600/20"
          >
            <Plus className="size-4" />
            Yeni Deneme Gir
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSave} className="mt-4 animate-in slide-in-from-top-2 fade-in rounded-xl border border-border bg-slate-900/50 p-4 mb-6">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Yeni Sonuç Ekle</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-xs text-muted-foreground">Türkçe Neti</label>
                <input disabled={isSaving} required type="number" step="0.25" value={turkce} onChange={e=>setTurkce(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mat. Neti</label>
                <input disabled={isSaving} required type="number" step="0.25" value={matematik} onChange={e=>setMatematik(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Sosyal Neti</label>
                <input disabled={isSaving} required type="number" step="0.25" value={sosyal} onChange={e=>setSosyal(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fen Neti</label>
                <input disabled={isSaving} required type="number" step="0.25" value={fen} onChange={e=>setFen(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="0" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button disabled={isSaving} type="submit" className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-50">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                Kaydet
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '14px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="turkce" name="Türkçe" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="matematik" name="Matematik" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                <Line type="monotone" dataKey="sosyal" name="Sosyal" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                <Line type="monotone" dataKey="fen" name="Fen" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                 <BarChart3 className="size-10 mb-2" />
                 <p className="text-sm">Henüz bir deneme verisi girmediniz.</p>
             </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <PieChartIcon className="size-5 text-sky-400" />
          <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
            Ders Ağırlığı
          </h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Son denemedeki netlerin dağılımı
        </p>
        
        <div className="mt-4 h-[240px] w-full flex items-center justify-center relative">
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', padding: '8px' }}
                    itemStyle={{ fontSize: '13px', color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-card-foreground">
                  {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span className="text-xs text-muted-foreground">Net</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Veri bulunamadı</div>
          )}
        </div>
        
        {pieData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="size-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
