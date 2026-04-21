"use client";

import { useState, useEffect, useRef } from "react";
import { UploadCloud, Calendar, FileText, Loader2, X, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Navigator from "../../components/Navigator";

interface Course {
  id: number;
  code: string;
  title: string;
}

interface TimetableSlot {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string;
  course: {
    code: string;
    title: string;
  };
}

export default function TimetablePage() {
  const [mounted, setMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const userId = localStorage.getItem('luminary_active_user');
    setCurrentUserId(userId);
    
    if (userId) {
      fetchTimetable(userId);
    }
  }, []);


  const fetchTimetable = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/timetable/${userId}`);
      const data = await res.json();
      if (data.status === "success") {
        setTimetable(data.timetable);
      }
    } catch (err) {
      console.error("Failed to fetch timetable", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/timetable/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.status === "success") {
        setNotification({ type: 'success', message: `Successfully synced ${data.slots_created} schedule slots!` });
        if (currentUserId) fetchTimetable(currentUserId);
      } else {
        setNotification({ type: 'error', message: data.detail || "Upload failed" });
      }
    } catch (error) {
      setNotification({ type: 'error', message: "Network error during upload." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <Link href="/" className="w-fit flex items-center gap-2 text-white/50 hover:text-white/90 transition-colors text-sm font-medium mb-4">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-white/60">
              Academic Schedule
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Manage your classes and upcoming tasks with AI precision.</p>
          </div>
        </div>

        {/* AI Ingestion Dropzone */}
        <div 
          className="relative overflow-hidden group cursor-pointer rounded-3xl border border-white/10 bg-white/5 p-12 backdrop-blur-2xl transition-all hover:bg-white/10 hover:border-indigo-500/50 mb-12"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="absolute inset-0 bg-linear-to-br from-indigo-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
          />

          <div className="relative flex flex-col items-center justify-center text-center space-y-6">
            <div className={`p-6 rounded-2xl bg-white/5 border border-white/10 text-indigo-400 shadow-xl transition-all ${isUploading ? 'scale-110' : 'group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30'}`}>
               {isUploading ? <Loader2 className="animate-spin" size={40} /> : <UploadCloud size={40} />}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white/90">Gemini Auto-Sync</h3>
              <p className="text-slate-400 max-w-md mx-auto mt-3 leading-relaxed">
                Drop your syllabus PDF or timetable image. Our AI will parse the schedule and sync it to your dashboard instantly.
              </p>
            </div>
            <div className="flex gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5">PDF</span>
                <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5">PNG</span>
                <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5">JPG</span>
            </div>
          </div>
        </div>

        {/* Timetable Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timetable.length > 0 ? (
                timetable.map((slot) => (
                    <div key={slot.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-white/20 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                <Calendar size={20} />
                            </div>
                            <span className="text-xs font-bold px-2 py-1 bg-white/5 rounded border border-white/10 text-slate-400 uppercase tracking-tighter">
                                {slot.day_of_week}
                            </span>
                        </div>
                        <h4 className="font-bold text-white/90 mb-1 line-clamp-1">{slot.course.title}</h4>
                        <p className="text-sm text-slate-500 font-mono mb-4">{slot.course.code}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">schedule</span>
                                {slot.start_time} - {slot.end_time}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">location_on</span>
                                {slot.room_number}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <Calendar size={48} className="mb-4 opacity-20" />
                    <p className="font-medium">No schedule data yet. Use Gemini Auto-Sync to get started.</p>
                </div>
            )}
        </div>
      </div>

      {/* Navigator */}
      <Navigator />


      {/* Global Notifications */}
      {notification && (
          <div className="fixed top-8 right-8 z-100 animate-in slide-in-from-right">
              <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  <div className="font-bold">{notification.message}</div>
                  <button onClick={() => setNotification(null)} className="ml-4 hover:opacity-70"><X size={18} /></button>
              </div>
          </div>
      )}
    </div>
  );
}
