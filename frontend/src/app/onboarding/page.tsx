"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [dragActive, setDragActive] = useState(false);
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/onboarding/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "success") {
          localStorage.setItem('luminary_active_user', data.new_user_id.toString());
          setStatus("success");
          setTimeout(() => {
            router.push("/");
          }, 1500);
        } else {
          setStatus("error");
        }
      } else {
        setStatus("error");
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden text-slate-800 dark:text-gray-100 font-body transition-colors">
      
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-xl w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/50 dark:border-white/10 p-10 rounded-3xl shadow-2xl relative z-10 flex flex-col items-center text-center">
        
        <div className="w-16 h-16 bg-linear-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-500/30">
          <UploadCloud size={32} />
        </div>

        <h1 className="text-3xl font-bold font-headline tracking-tight mb-2">Smart Onboarding</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
          Upload your academic scheme & syllabus (PDF, TXT or Images). Our AI will automatically construct your intelligent curriculum dashboard.
        </p>

        {status === "idle" || status === "error" ? (
          <div className="w-full flex flex-col items-center">
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center cursor-pointer 
                ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.02]' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
              `}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept=".pdf,.txt,image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              
              {file ? (
                <div className="flex flex-col items-center gap-3 animate-in zoom-in-95">
                  <FileText size={48} className="text-indigo-500" />
                  <p className="font-semibold text-slate-700 dark:text-gray-200">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <span className="material-symbols-outlined text-2xl">publish</span>
                  </div>
                  <p className="font-medium inline-block"><span className="text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop</p>
                  <p className="text-xs">PDF, TXT or Images/Photos supported</p>
                </div>
              )}
            </div>

            {status === "error" && (
               <p className="mt-4 text-red-500 text-sm font-semibold flex items-center gap-2 bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-lg border border-red-200 dark:border-red-500/20">
                 <span className="material-symbols-outlined text-[18px]">error</span> Upload failed. Please try again.
               </p>
            )}

            <button 
              onClick={handleUpload}
              disabled={!file}
              className="mt-8 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 dark:hover:bg-slate-200"
            >
              Analyze Curriculum
            </button>
            <button
               onClick={() => router.push("/")}
               className="mt-4 w-full border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 py-3 rounded-xl font-semibold transition-all text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
               Skip for Now
            </button>
          </div>
        ) : status === "uploading" ? (
          <div className="w-full flex flex-col items-center py-10 animate-in fade-in">
             <div className="relative mb-8">
               <Loader2 size={64} className="text-indigo-500 animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <span className="material-symbols-outlined text-indigo-500 text-xl animate-pulse">auto_awesome</span>
               </div>
             </div>
             <h3 className="text-xl font-bold mb-2">AI is analyzing your curriculum...</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Processing modules, credits, and syllabus structure.</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center py-10 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50 dark:ring-emerald-500/10">
               <CheckCircle size={40} />
             </div>
             <h3 className="text-2xl font-bold mb-2 font-headline">Pipeline Complete</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Redirecting to your new dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
