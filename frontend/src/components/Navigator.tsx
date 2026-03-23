"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface NavigatorProps {
  onOpenProfile?: () => void;
  onNavigate?: (view: string) => void;
}

export default function Navigator({ onOpenProfile, onNavigate }: NavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAcademicsOpen, setIsAcademicsOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();
    
    // Keyword routing logic
    if (query.includes("grade") || query.includes("mark") || query.includes("score")) {
      setIsOpen(false);
      setSearchQuery("");
      if (onNavigate) onNavigate("marks");
      else router.push("/marks");
      return;
    } else if (query.includes("time") || query.includes("schedule")) {
      setIsOpen(false);
      setSearchQuery("");
      if (onNavigate) onNavigate("timetable");
      else router.push("/timetable");
      return;
    } else if (query.includes("assign") || query.includes("homework")) {
      setIsOpen(false);
      setSearchQuery("");
      if (onNavigate) onNavigate("assignments");
      else router.push("/assignments");
      return;
    } else if (query.includes("quiz") || query.includes("test")) {
      setIsOpen(false);
      setSearchQuery("");
      if (onNavigate) onNavigate("quizzes");
      else router.push("/quizzes");
      return;
    } else if (query.includes("exam")) {
      setIsOpen(false);
      setSearchQuery("");
      if (onNavigate) onNavigate("exams");
      else router.push("/exams");
      return;
    } else if (query.includes("profile") || query.includes("account")) {
      setIsOpen(false);
      setSearchQuery("");
      if (onOpenProfile) onOpenProfile();
      else router.push("/profile");
      return;
    } else if (query.includes("dash") || query.includes("home") || query.includes("main")) {
      setIsOpen(false);
      setSearchQuery("");
      if (window.location.pathname === "/") {
        return;
      } else {
        router.push("/");
      }
      return;
    } else if (query.includes("chat") || query.includes("bot") || query.includes("ai")) {
      // In a real scenario, this might trigger a global state to open the bot
      // Here we just navigate to a chatbot route if it exists, or alert
      router.push("/chatbot");
    } else {
      // Default search fallback
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
    
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-4 font-body">
      
      {/* Omni-Menu Panel */}
      {isOpen && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl w-72 flex flex-col overflow-hidden mb-2 animate-in slide-in-from-bottom-5 origin-bottom-left">
          
          <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
             <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
               <span className="material-symbols-outlined rounded-full bg-indigo-100 dark:bg-indigo-900/40 p-1.5 text-[18px]">explore</span>
               <span className="font-headline font-bold text-slate-800 dark:text-gray-100 tracking-tight">Omni-Navigator</span>
             </div>
             <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full bg-white dark:bg-slate-800">
               <span className="material-symbols-outlined text-[18px]">close</span>
             </button>
          </div>

          <form onSubmit={handleSearch} className="p-3 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 flex gap-2">
            <span className="material-symbols-outlined text-slate-400 text-[20px] ml-2 mt-2">search</span>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Where do you want to go?" 
              className="w-full bg-transparent text-sm py-2 rounded-lg outline-none text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-slate-500"
              autoFocus
            />
          </form>

          <div className="flex-1 p-2 overflow-y-auto max-h-64 space-y-1">
             <button onClick={() => { setIsOpen(false); if (window.location.pathname !== "/") router.push("/"); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-gray-200 text-sm font-semibold">
               <span className="material-symbols-outlined text-[20px] text-slate-400">dashboard</span>
               Dashboard
             </button>

             <button onClick={() => { setIsOpen(false); if (onOpenProfile) { onOpenProfile(); } else { router.push("/profile"); } }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-gray-200 text-sm font-semibold">
               <span className="material-symbols-outlined text-[20px] text-slate-400">person</span>
               Profile
             </button>
             
             <div className="rounded-xl overflow-hidden transition-all duration-300">
               <button 
                 onClick={() => setIsAcademicsOpen(!isAcademicsOpen)} 
                 className="w-full flex justify-between items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-gray-200 text-sm font-semibold"
               >
                 <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-slate-400">school</span>
                    Academics
                 </div>
                 <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${isAcademicsOpen ? 'rotate-180' : ''}`}>expand_more</span>
               </button>
               
               {isAcademicsOpen && (
                 <div className="bg-slate-50 dark:bg-slate-800/30 py-2 px-4 space-y-1 rounded-b-xl border-t border-slate-100 dark:border-white/5">
                   <button onClick={() => { setIsOpen(false); if (onNavigate) onNavigate('marks'); else router.push("/marks"); }} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-gray-300 text-sm ml-6 font-semibold">
                     <span className="material-symbols-outlined text-[16px] text-indigo-500 dark:text-indigo-400">calculate</span>
                     Marks
                   </button>
                   <button onClick={() => { setIsOpen(false); if (onNavigate) onNavigate('timetable'); else router.push("/timetable"); }} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-gray-300 text-sm ml-6 font-semibold">
                     <span className="material-symbols-outlined text-[16px] text-teal-500 dark:text-teal-400">calendar_month</span>
                     Timetable
                   </button>
                   <button onClick={() => { setIsOpen(false); if (onNavigate) onNavigate('assignments'); else router.push("/assignments"); }} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-gray-300 text-sm ml-6 font-semibold">
                     <span className="material-symbols-outlined text-[16px] text-orange-500 dark:text-orange-400">assignment</span>
                     Assignments
                   </button>
                   <button onClick={() => { setIsOpen(false); if (onNavigate) onNavigate('exams'); else router.push("/exams"); }} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-gray-300 text-sm ml-6 font-semibold">
                     <span className="material-symbols-outlined text-[16px] text-rose-500 dark:text-rose-400">history_edu</span>
                     Exams
                   </button>
                   <button onClick={() => { setIsOpen(false); if (onNavigate) onNavigate('quizzes'); else router.push("/quizzes"); }} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-gray-300 text-sm ml-6 font-semibold">
                     <span className="material-symbols-outlined text-[16px] text-blue-500 dark:text-blue-400">quiz</span>
                     Quizzes
                   </button>
                 </div>
               )}
             </div>

             <Link href="/chatbot" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-gray-200 text-sm font-semibold">
               <span className="material-symbols-outlined text-[20px] text-slate-400">smart_toy</span>
               Chatbot (Global Log)
             </Link>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-14 h-14 transition-all duration-300 flex items-center justify-center rounded-full shadow-2xl border border-white/20 backdrop-blur-md hover:scale-105 active:scale-95 ${
          isOpen 
            ? 'bg-indigo-600 text-white shadow-indigo-600/30' 
            : 'bg-white/90 dark:bg-slate-900/90 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
        }`}
      >
         <span className={`material-symbols-outlined text-2xl transition-transform ${isOpen ? 'rotate-90' : ''}`} style={{fontVariationSettings: "'FILL' 1"}}>
           {isOpen ? 'close' : 'explore'}
         </span>
      </button>
      
    </div>
  );
}
