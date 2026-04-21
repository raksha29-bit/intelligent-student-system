"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUserId = localStorage.getItem('luminary_active_user') || "STU-101";
    fetch(`http://localhost:8000/api/quizzes/${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setQuizzes(data.quizzes);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const availableQuizzes = quizzes.filter(q => q.status === "Available");
  const completedQuizzes = quizzes.filter(q => q.status === "Completed");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors duration-300">
      <header className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-colors text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <h1 className="font-headline font-bold text-xl tracking-tight text-slate-800 dark:text-gray-100">Quizzes Explorer</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-32 pt-8 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-4xl text-blue-500 mb-4">progress_activity</span>
            <p className="font-semibold uppercase tracking-widest text-slate-500 text-xs">Loading Modules...</p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Available Quizzes */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">play_circle</span>
                 </div>
                 <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-gray-100">Available Quizzes</h2>
                 {availableQuizzes.length > 0 && (
                   <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-3 py-1 rounded-full">{availableQuizzes.length} Default</span>
                 )}
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {availableQuizzes.length > 0 ? (
                    availableQuizzes.map(quiz => (
                       <div key={quiz.id} className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden flex flex-col h-full">
                          
                          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-400 to-indigo-500"></div>

                          <div className="flex items-start justify-between mb-4">
                             <div>
                                <span className="inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-md mb-2">{quiz.course.code}</span>
                                <h3 className="font-headline font-bold text-lg text-slate-800 dark:text-gray-100 leading-tight">{quiz.title}</h3>
                             </div>
                             <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">quiz</span>
                             </div>
                          </div>
                          
                          <div className="mb-6">
                             <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{quiz.course.title}</p>
                             <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                <span className="material-symbols-outlined text-[14px]">format_list_numbered</span>
                                {quiz.total_questions} Questions
                             </div>
                          </div>

                          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                             <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-500/20">
                                Start Quiz
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                             </button>
                          </div>
                       </div>
                    ))
                 ) : (
                    <div className="col-span-full py-12 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-dashed dark:border-white/10 text-center">
                       <p className="text-slate-500 dark:text-slate-400 mb-2">No quizzes are currently available.</p>
                       <p className="text-sm text-slate-400">You're all caught up!</p>
                    </div>
                 )}
              </div>
            </section>

            {/* Completed Quizzes */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                 </div>
                 <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-gray-400">Completed Quizzes</h2>
              </div>
              
              <div className="grid gap-4">
                 {completedQuizzes.length > 0 ? (
                    completedQuizzes.map(quiz => {
                       const percentage = Math.round((quiz.score / quiz.total_questions) * 100);
                       
                       let barColor = "bg-teal-500";
                       let lightModeBarBg = "bg-teal-100";
                       let darkModeBarBg = "dark:bg-teal-900/40";
                       
                       if (percentage < 50) {
                          barColor = "bg-rose-500";
                          lightModeBarBg = "bg-rose-100";
                          darkModeBarBg = "dark:bg-rose-900/40";
                       } else if (percentage < 75) {
                          barColor = "bg-amber-500";
                          lightModeBarBg = "bg-amber-100";
                          darkModeBarBg = "dark:bg-amber-900/40";
                       }

                       return (
                          <div key={quiz.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                             
                             <div className="flex items-start gap-4 mb-4 md:mb-0">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                   <span className="material-symbols-outlined text-[20px]">task_alt</span>
                                </div>
                                <div>
                                   <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{quiz.course.code}</span>
                                   <h3 className="font-headline font-bold text-slate-700 dark:text-gray-200">{quiz.title}</h3>
                                   <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{quiz.course.title}</p>
                                </div>
                             </div>

                             <div className="flex items-center md:w-1/3 gap-4">
                                <div className={`flex-1 h-2 rounded-full overflow-hidden ${lightModeBarBg} ${darkModeBarBg}`}>
                                   <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percentage}%` }}></div>
                                </div>
                                <div className="shrink-0 flex items-baseline gap-1 min-w-[70px] justify-end">
                                   <span className="font-bold text-lg text-slate-800 dark:text-gray-100">{quiz.score}</span>
                                   <span className="text-xs font-bold text-slate-400">/ {quiz.total_questions}</span>
                                </div>
                             </div>

                          </div>
                       );
                    })
                 ) : (
                    <div className="py-8 text-center text-slate-400">No completed quizzes yet.</div>
                 )}
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
