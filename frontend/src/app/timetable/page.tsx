"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TimetablePage() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState("Monday");

  useEffect(() => {
    const currentUserId = localStorage.getItem('luminary_active_user') || "STU-101";
    fetch(`http://localhost:8000/api/timetable/${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setTimetable(data.timetable);
          
          // Auto-select the day with first available class or current day if weekday
          const todayIndex = new Date().getDay();
          if (todayIndex >= 1 && todayIndex <= 5) {
             setActiveDay(DAYS[todayIndex - 1]);
          }
        }
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const getSlotsForDay = (day: string) => {
    return timetable
      .filter((s) => s.day_of_week === day)
      .sort((a, b) => {
        // Simple sort logic based on start time string like "09:00 AM"
        const getTimeVal = (timeStr: string) => {
            const [time, period] = timeStr.split(' ');
            let [hours, mins] = time.split(':').map(Number);
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return hours * 60 + mins;
        }
        return getTimeVal(a.start_time) - getTimeVal(b.start_time);
      });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors duration-300">
      <header className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-colors text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <h1 className="font-headline font-bold text-xl tracking-tight text-slate-800 dark:text-gray-100">Timetable Explorer</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-32 pt-8 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-4xl text-indigo-500 mb-4">progress_activity</span>
            <p className="font-semibold uppercase tracking-widest text-slate-500 text-xs">Synchronizing Calendar...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Days Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
              {DAYS.map(day => {
                const isActive = activeDay === day;
                const slotCount = timetable.filter(s => s.day_of_week === day).length;
                return (
                  <button 
                    key={day} 
                    onClick={() => setActiveDay(day)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap font-bold text-sm transition-all shadow-sm ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {day}
                    {slotCount > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{slotCount}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Slots List for Active Day */}
            <div className="space-y-4">
              {getSlotsForDay(activeDay).length > 0 ? (
                getSlotsForDay(activeDay).map(slot => {
                  const isLab = slot.course.title.toLowerCase().includes('lab');
                  
                  return (
                    <div key={slot.id} className={`flex flex-col md:flex-row md:items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border ${isLab ? 'border-orange-200 dark:border-orange-500/30' : 'border-indigo-200 dark:border-indigo-500/30'} rounded-3xl p-6 shadow-sm hover:-translate-y-1 transition-transform group relative overflow-hidden`}>
                       
                       {/* Subtle accent background gradient */}
                       <div className={`absolute top-0 right-0 w-64 h-full bg-linear-to-l ${isLab ? 'from-orange-500/5' : 'from-indigo-500/5'} to-transparent blur-md -z-10`}></div>
                       
                       <div className="flex items-center gap-6 md:w-1/4 mb-4 md:mb-0 shrink-0">
                         <div className={`flex flex-col items-center justify-center p-3 rounded-2xl ${isLab ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                            <span className="material-symbols-outlined mb-1">{isLab ? 'science' : 'menu_book'}</span>
                            <span className="text-xs font-bold uppercase tracking-widest">{isLab ? 'LAB' : 'THEORY'}</span>
                         </div>
                         <div>
                           <p className="font-bold text-slate-800 dark:text-gray-100 text-lg tracking-tight">{slot.start_time}</p>
                           <p className="text-slate-500 dark:text-slate-400 text-sm font-medium border-t border-slate-200 dark:border-white/10 mt-1 pt-1">{slot.end_time}</p>
                         </div>
                       </div>
                       
                       <div className="flex-1 md:px-8 border-l-0 md:border-l border-slate-100 dark:border-white/10">
                         <h3 className="font-headline text-xl font-bold tracking-tight text-slate-800 dark:text-gray-100 mb-1">{slot.course.title}</h3>
                         <div className="flex items-center gap-3">
                           <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${isLab ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'}`}>{slot.course.code}</span>
                           <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium">
                             <span className="material-symbols-outlined text-[16px]">location_on</span>
                             {slot.room_number}
                           </div>
                         </div>
                       </div>
                       
                       <div className="hidden md:flex justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors">
                           <span className="material-symbols-outlined">more_vert</span>
                         </button>
                       </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5 rounded-3xl">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <span className="material-symbols-outlined text-4xl">free_cancellation</span>
                  </div>
                  <h3 className="text-xl font-headline font-bold text-slate-800 dark:text-gray-100 mb-2">No Classes Today!</h3>
                  <p className="text-slate-500">Enjoy your free time or prepare for upcoming assignments.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
