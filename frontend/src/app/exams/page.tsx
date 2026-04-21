"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUserId = localStorage.getItem('luminary_active_user') || "STU-101";
    fetch(`http://localhost:8000/api/exams/${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setExams(data.exams);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const upcomingExams = exams
    .filter(e => new Date(e.exam_date) >= new Date())
    .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
    
  const pastExams = exams
    .filter(e => new Date(e.exam_date) < new Date())
    .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

  const getDaysRemaining = (examDateStr: string) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const examDate = new Date(examDateStr);
      examDate.setHours(0,0,0,0);
      const diffTime = Math.abs(examDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
  };

  const formatDate = (dateStr: string) => {
      return new Intl.DateTimeFormat('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit'
      }).format(new Date(dateStr));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors duration-300">
      <header className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-colors text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <h1 className="font-headline font-bold text-xl tracking-tight text-slate-800 dark:text-gray-100">Exams Explorer</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-32 pt-8 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-4xl text-rose-500 mb-4">progress_activity</span>
            <p className="font-semibold uppercase tracking-widest text-slate-500 text-xs">Fetching Exam Schedules...</p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Upcoming Exams Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                 </div>
                 <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-gray-100">Upcoming Exams</h2>
                 {upcomingExams.length > 0 && (
                   <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-3 py-1 rounded-full">{upcomingExams.length} Scheduled</span>
                 )}
              </div>

              <div className="grid gap-6">
                {upcomingExams.length > 0 ? (
                  upcomingExams.map((exam, i) => {
                    const daysRemaining = getDaysRemaining(exam.exam_date);
                    const isUrgent = daysRemaining <= 7;
                    return (
                        <div key={exam.id} className="relative flex flex-col md:flex-row md:items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            
                            <div className={`absolute left-0 top-6 bottom-6 w-1 ${isUrgent ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'} rounded-r-lg`}></div>

                            <div className="flex-1 md:pl-6">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-sm font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase">{exam.course.code}</span>
                                    <h3 className="font-headline text-xl font-bold tracking-tight text-slate-800 dark:text-gray-100">{exam.course.title}</h3>
                                </div>
                                <h4 className="text-slate-500 dark:text-slate-400 font-medium mb-4">{exam.title}</h4>
                                
                                <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-slate-400">calendar_month</span>
                                        {formatDate(exam.exam_date)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-slate-400">schedule</span>
                                        {exam.duration_minutes} Minutes
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-slate-400">location_on</span>
                                        {exam.location}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 md:mt-0 md:ml-6 shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 min-w-[120px]">
                                <span className={`text-3xl font-bold font-headline ${isUrgent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-gray-200'}`}>{daysRemaining}</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Days Left</span>
                            </div>
                        </div>
                    );
                  })
                ) : (
                  <div className="py-12 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-dashed dark:border-white/10 text-center">
                     <p className="text-slate-500 dark:text-slate-400">No upcoming exams. Enjoy the semester!</p>
                  </div>
                )}
              </div>
            </section>

            {/* Past Exams Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                 </div>
                 <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-gray-400">Past Exams</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                  {pastExams.length > 0 ? (
                      pastExams.map(exam => (
                          <div key={exam.id} className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors opacity-80 hover:opacity-100">
                             <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{exam.course.code}</span>
                                    <h3 className="font-headline font-bold text-slate-700 dark:text-gray-300">{exam.course.title}</h3>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 line-through decoration-slate-400/50">{exam.title}</span>
                             </div>
                             <div className="flex items-center gap-2 text-sm text-slate-500 mt-4">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Completed on {formatDate(exam.exam_date).split(',')[1]?.trim() || formatDate(exam.exam_date)}
                             </div>
                          </div>
                      ))
                  ) : (
                      <div className="col-span-full py-8 text-center text-slate-400">No past exams found.</div>
                  )}
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
