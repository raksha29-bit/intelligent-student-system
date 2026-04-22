"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function MarksPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [marksData, setMarksData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [predictedSgpa, setPredictedSgpa] = useState<number | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchMarks = () => {
    setIsLoading(true);
    const userId = localStorage.getItem('luminary_active_user') || '1';
    fetch(`http://localhost:8000/api/dashboard/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setMarksData(data.marks || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  const handleAssessmentUpdate = async (id: number, score: string) => {
    if (!score || isNaN(Number(score))) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(score) })
      });
      if (res.ok) {
        fetchMarks();
      }
    } catch (err) {
      console.error("Failed to update assessment:", err);
    }
  };

  const handlePredictSgpa = async () => {
    setIsPredicting(true);
    try {
      const userId = localStorage.getItem('luminary_active_user') || '1';
      const res = await fetch(`http://localhost:8000/api/risk/predict_sgpa/${userId}`);
      const data = await res.json();
      setPredictedSgpa(data.predicted_sgpa);
    } catch (err) {
      console.error("Failed to predict SGPA:", err);
      setPredictedSgpa(0.0);
    } finally {
      setIsPredicting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchMarks();
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 px-6 py-12 font-body transition-colors duration-300">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
           <div>
             <h1 className="font-headline text-3xl font-bold tracking-tight text-slate-800 dark:text-gray-100 flex items-center gap-3 mb-2">
                 <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                   <span className="material-symbols-outlined">calculate</span>
                 </div>
                 Marks Explorer
             </h1>
             <p className="text-slate-500 dark:text-slate-400 font-medium">Review your academic performance and grades.</p>
           </div>
           
           <div className="flex items-center gap-4">
             {predictedSgpa !== null && (
               <div className="flex items-center bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 shadow-sm backdrop-blur-md">
                 <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mr-2 uppercase tracking-widest">Predicted SGPA:</span>
                 <span className="text-xl font-extrabold bg-linear-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">{predictedSgpa}</span>
               </div>
             )}
             <button 
               onClick={handlePredictSgpa}
               disabled={isPredicting}
               className="flex items-center gap-2 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_25px_rgba(99,102,241,0.7)] hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
             >
               {isPredicting ? (
                 <>
                   <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                   Calculating...
                 </>
               ) : (
                 <>
                   <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                   Predict SGPA
                 </>
               )}
             </button>
             <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 p-2 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-colors text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
             </button>
             <Link href="/" className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-white/10">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Dashboard
             </Link>
           </div>
        </div>

        {/* Content */}
        <div className="bg-white/90 dark:bg-slate-900/90 p-8 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/10 backdrop-blur-xl w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="material-symbols-outlined animate-spin text-4xl mb-4">progress_activity</span>
              <p className="font-semibold tracking-widest text-sm uppercase">Loading Records...</p>
            </div>
          ) : marksData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-4">format_list_bulleted</span>
              <p className="font-semibold text-lg">No academic records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                    <th className="p-5">Course</th>
                    <th className="p-5">Type</th>
                    <th className="p-5">Exact Score</th>
                    <th className="p-5 text-right">Status</th>
                    <th className="p-5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {marksData.map((mark) => {
                    const percentage = (mark.score / mark.max_score) * 100;
                    const isWarning = percentage < 40;
                    const isExpanded = expandedRows.has(mark.id);
                    return (
                      <Fragment key={mark.id}>
                        <tr 
                          onClick={() => toggleRow(mark.id)}
                          className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                        >
                          <td className="p-5">
                            <div className="font-bold text-slate-800 dark:text-gray-100 text-[15px]">{mark.course.title}</div>
                            <div className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mt-1">{mark.course.code}</div>
                          </td>
                          <td className="p-5">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-1.5 px-3 rounded-lg text-[10px] font-bold tracking-widest uppercase border border-slate-200 dark:border-white/5 inline-flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">
                                  {mark.type === 'theory' ? 'book' : 'science'}
                              </span>
                              {mark.type}
                            </span>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                               <div className="font-bold text-slate-800 dark:text-gray-100 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
                                 {mark.score} <span className="text-slate-400 font-medium">/ {mark.max_score}</span>
                               </div>
                               <div className="text-xs font-bold text-slate-500">
                                 {percentage.toFixed(0)}%
                               </div>
                            </div>
                          </td>
                          <td className="p-5 text-right">
                            {isWarning ? (
                              <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 py-1.5 px-4 rounded-full text-[10px] font-bold tracking-widest uppercase border border-red-200 dark:border-red-500/30 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">warning</span> Warning
                              </span>
                            ) : (
                              <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-1.5 px-4 rounded-full text-[10px] font-bold tracking-widest uppercase border border-emerald-200 dark:border-emerald-500/30 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">task_alt</span> Pass
                              </span>
                            )}
                          </td>
                          <td className="p-5 text-right w-10 opacity-70">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors" />
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-0 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                              <div className="p-6 overflow-hidden transition-all duration-300">
                                <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-inner">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Assessment Breakdown</h4>
                                  {mark.breakdown && mark.breakdown.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {mark.breakdown.map((b: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-white/5 flex items-center justify-between group/item">
                                          <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 limit-lines-1">{b.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Max: {b.max_score}</span>
                                          </div>
                                          {b.id ? (
                                            <div className="flex items-center gap-2">
                                              <input 
                                                type="number" 
                                                defaultValue={b.raw_score !== null ? b.raw_score : ""}
                                                onBlur={(e) => handleAssessmentUpdate(b.id, e.target.value)}
                                                placeholder="--"
                                                className="w-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                              />
                                            </div>
                                          ) : (
                                            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md">{b.score || b.score_display}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-500 italic">No breakdown available.</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
