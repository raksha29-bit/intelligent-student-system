"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function CourseDeepDivePage() {
  const params = useParams();
  const id = params?.id;
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const currentUserId = localStorage.getItem('luminary_active_user') || "STU-101";
    fetch(`http://localhost:8000/api/courses/${id}/student/${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setCourseData(data);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <span className="material-symbols-outlined animate-spin text-5xl text-indigo-500 mb-4">progress_activity</span>
        <p className="font-semibold uppercase tracking-widest text-slate-500 text-sm">Fetching Course Data...</p>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <h1 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Course Not Found</h1>
        <Link href="/" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md">Back to Dashboard</Link>
      </div>
    );
  }

  const { course, syllabus, marks, assessments = [] } = courseData;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-8 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-colors text-slate-600 dark:text-slate-300 flex items-center justify-center group">
              <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            </Link>
            <div>
               <h1 className="font-headline font-bold text-xl md:text-2xl tracking-tight text-slate-800 dark:text-gray-100 leading-tight line-clamp-1 pr-4">{course.title}</h1>
               <div className="flex items-center gap-2 mt-0.5">
                 <span className="text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">{course.code}</span>
                 <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide border-l border-slate-300 dark:border-white/10 pl-2">{course.credits} Credits</span>
               </div>
            </div>
        </div>
        <Link href="/" className="hidden md:flex bg-slate-800 text-white dark:bg-white dark:text-slate-900 px-5 py-2 rounded-xl font-bold text-sm shadow hover:opacity-90 transition">Dashboard</Link>
      </header>

      <main className="flex-1 px-6 md:px-10 pb-32 pt-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Left Column: Syllabus */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">auto_stories</span>
               </div>
               <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-gray-100">Course Syllabus</h2>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-blue-500/5 to-transparent rounded-full blur-3xl -z-10"></div>
               
               <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8">
                  {syllabus.map((item: any, i: number) => {
                      const isCompleted = item.status === "completed";
                      const isInProgress = item.status === "in_progress";
                      
                      let dotColor = "bg-slate-200 dark:bg-slate-700 border-white dark:border-slate-900";
                      let textColor = "text-slate-400";
                      let icon = "pending";
                      
                      if (isCompleted) {
                          dotColor = "bg-teal-500 border-teal-50 dark:border-teal-900/50";
                          textColor = "text-slate-700 dark:text-slate-200";
                          icon = "check_circle";
                      } else if (isInProgress) {
                          dotColor = "bg-blue-500 border-blue-50 dark:border-blue-900/50";
                          textColor = "text-blue-700 dark:text-blue-400";
                          icon = "play_circle";
                      }

                      return (
                         <div key={i} className={`relative pl-8 transition-opacity duration-300 ${!isCompleted && !isInProgress ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}>
                             {/* Timeline Dot */}
                             <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 ${dotColor} shadow-sm z-10 flex items-center justify-center`}></div>
                             
                             <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 md:gap-4">
                                <div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Week {item.week}</p>
                                   <h3 className={`font-headline text-[17px] font-bold ${textColor} leading-snug`}>{item.topic}</h3>
                                </div>
                                <span className={`flex w-fit items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap mt-1 sm:mt-0 ${
                                    isCompleted ? 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' :
                                    isInProgress ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 animate-pulse' :
                                    'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                   <span className="material-symbols-outlined text-[12px]">{icon}</span>
                                   {item.status.replace('_', ' ').toUpperCase()}
                                </span>
                             </div>
                         </div>
                      );
                  })}
               </div>
            </div>
         </div>

         {/* Right Column: Performance */}
         <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">monitoring</span>
               </div>
               <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-gray-100">Performance</h2>
            </div>
            
            <div className="space-y-4">
               {marks.length > 0 ? marks.map((mark: any) => {
                  const percentage = Math.round((mark.score / mark.max_score) * 100);
                  
                  let gradientColor = "from-indigo-500 to-purple-500";
                  let bgGlow = "bg-indigo-50 dark:bg-indigo-500/10";
                  let textScore = "text-indigo-600 dark:text-indigo-400";
                  
                  if (percentage >= 85) {
                      gradientColor = "from-emerald-400 to-teal-500";
                      bgGlow = "bg-emerald-50 dark:bg-emerald-500/10";
                      textScore = "text-emerald-600 dark:text-emerald-400";
                  } else if (percentage < 50) {
                      gradientColor = "from-rose-400 to-red-500";
                      bgGlow = "bg-rose-50 dark:bg-rose-500/10";
                      textScore = "text-rose-600 dark:text-rose-400";
                  }

                  return (
                      <div key={mark.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                         <div className="flex justify-between items-end mb-4">
                            <div>
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{mark.type}</p>
                               <div className="flex items-baseline gap-1 mt-1">
                                  <span className="text-3xl font-headline font-black text-slate-800 dark:text-gray-100">{mark.score}</span>
                                  <span className="text-sm font-bold text-slate-400">/ {mark.max_score}</span>
                               </div>
                            </div>
                            <div className={`px-4 py-2 rounded-2xl ${bgGlow}`}>
                               <span className={`text-xl font-black font-headline ${textScore}`}>{percentage}%</span>
                            </div>
                         </div>
                         
                         <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full bg-linear-to-r ${gradientColor} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
                         </div>
                      </div>
                  );
               }) : (
                  <div className="bg-white/50 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-dashed dark:border-white/10 text-center text-slate-500">
                     No marks recorded for this course yet.
                  </div>
               )}
            </div>
            
            {/* Assessment Breakdown */}
            <div className="mt-8">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                     <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
                  </div>
                  <h3 className="text-xl font-headline font-bold text-slate-800 dark:text-gray-100">Assessment Breakdown</h3>
               </div>
               <div className="space-y-3">
                  {assessments.length > 0 ? assessments.map((assessment: any) => (
                      <div key={assessment.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                         <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{assessment.type}</p>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight limit-lines-1 max-w-[150px] sm:max-w-xs">{assessment.title}</h4>
                         </div>
                         <div className="text-right">
                            {assessment.score !== null ? (
                               <div className="flex items-baseline gap-1">
                                  <span className="font-bold text-slate-800 dark:text-slate-100">{assessment.score}</span>
                                  <span className="text-xs text-slate-400">/ {assessment.max_score}</span>
                               </div>
                            ) : (
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                   assessment.status.toLowerCase() === 'completed' || assessment.status.toLowerCase() === 'submitted' || assessment.status.toLowerCase() === 'graded'
                                   ? 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' 
                                   : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                               }`}>{assessment.status}</span>
                            )}
                         </div>
                      </div>
                  )) : (
                      <div className="bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-dashed dark:border-white/10 text-center text-sm text-slate-500">
                         No assessments recorded.
                      </div>
                  )}
               </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-linear-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-inner mt-8">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Course Links</h3>
               <div className="space-y-3">
                  <Link href="/assignments" className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm border border-slate-100 dark:border-white/5 group">
                     <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-orange-500">assignment</span>
                        <span className="font-bold text-slate-700 dark:text-gray-300 text-sm">Assignments</span>
                     </div>
                     <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">chevron_right</span>
                  </Link>
                  <Link href="/exams" className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm border border-slate-100 dark:border-white/5 group">
                     <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-rose-500">history_edu</span>
                        <span className="font-bold text-slate-700 dark:text-gray-300 text-sm">Exams</span>
                     </div>
                     <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">chevron_right</span>
                  </Link>
               </div>
            </div>

         </div>
      </main>
    </div>
  );
}
