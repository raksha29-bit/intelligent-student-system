"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUserId = localStorage.getItem('luminary_active_user') || "STU-101";
    fetch(`http://localhost:8000/api/assignments/${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setAssignments(data.assignments);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const pendingAssignments = assignments.filter((a: any) => a.status === "Pending");
  const completedAssignments = assignments.filter((a: any) => ["Submitted", "Graded"].includes(a.status));

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors duration-300">
      
      {/* Top Header */}
      <header className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-colors text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <h1 className="font-headline font-bold text-xl tracking-tight text-slate-800 dark:text-gray-100">Assignments</h1>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto px-8 pb-32 pt-8 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-4xl text-indigo-500 mb-4">progress_activity</span>
            <p className="font-semibold uppercase tracking-widest text-slate-500 text-xs">Syncing Academic Ledger...</p>
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* Pending Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-orange-500">pending_actions</span>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-slate-800 dark:text-gray-100">Active & Pending</h2>
                <span className="ml-2 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 py-1 px-3 rounded-full text-xs font-bold">{pendingAssignments.length}</span>
              </div>
              
              {pendingAssignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingAssignments.map((a: any) => {
                    const diffTime = Math.abs(new Date(a.due_date).getTime() - new Date().getTime());
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    const isUrgent = daysLeft <= 3;
                    const dateStr = new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    
                    return (
                      <div key={a.id} className={`p-6 rounded-3xl shadow-sm border transition-all hover:-translate-y-1 ${isUrgent ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20' : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-white/10'}`}>
                         <div className="flex justify-between items-start mb-4">
                           <div>
                             <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded mb-2 inline-block">{a.course.code}</span>
                             <h3 className="font-semibold text-lg text-slate-800 dark:text-gray-100 line-clamp-1" title={a.title}>{a.title}</h3>
                           </div>
                           <span className={`material-symbols-outlined ${isUrgent ? 'text-red-500' : 'text-slate-400'}`}>assignment_late</span>
                         </div>
                         <div className="flex justify-between items-center mt-6">
                           <div className="flex items-center gap-2">
                             <span className={`material-symbols-outlined text-[18px] ${isUrgent ? 'text-red-500' : 'text-slate-400'}`}>calendar_today</span>
                             <span className={`text-sm font-medium ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>Due {dateStr}</span>
                           </div>
                           <button className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl shadow-sm transition-colors">
                             <span className="material-symbols-outlined text-[16px]">upload</span> Submit
                           </button>
                         </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5 rounded-3xl text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">task_alt</span>
                  <p>You have no pending assignments!</p>
                </div>
              )}
            </section>

            {/* Completed Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-emerald-500">checklist</span>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-slate-800 dark:text-gray-100">Completed</h2>
                <span className="ml-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 py-1 px-3 rounded-full text-xs font-bold">{completedAssignments.length}</span>
              </div>
              
              {completedAssignments.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {completedAssignments.map((a: any) => {
                    const dateStr = new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return (
                      <div key={a.id} className="p-5 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl transition-colors hover:border-slate-300 dark:hover:border-white/20">
                        <div className="flex items-center border-l-4 border-emerald-500 pl-4 w-full max-w-2xl">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-4 text-emerald-500 shrink-0">
                             <span className="material-symbols-outlined text-[20px]">done_all</span>
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="font-semibold text-slate-800 dark:text-gray-100 truncate" title={a.title}>{a.title}</h3>
                            <p className="text-xs text-slate-500 mt-1">{a.course.code} • {a.course.title}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-4">
                          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${a.status === 'Graded' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>{a.status}</span>
                          <span className="text-xs text-slate-400 mt-2">Due {dateStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5 rounded-3xl text-slate-500">
                  <p>No completed assignments yet.</p>
                </div>
              )}
            </section>
            
          </div>
        )}
      </main>
    </div>
  );
}
