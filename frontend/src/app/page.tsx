"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import Navigator from "../components/Navigator";
import ReactMarkdown from 'react-markdown';

interface RecentItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  colorClass: string;
}

export default function Dashboard() {
  const DEMO_FORCE_RISK = true; // Set to true for hackathon demonstrations to force the 'CRITICAL' risk state.
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMarksOpen, setIsMarksOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Registration States
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("AIML");
  const [semester, setSemester] = useState("1");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  
  // Login States
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Security States
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // User DB for localStorage
  const [usersDB, setUsersDB] = useState<any[]>([]);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  
  const [mounted, setMounted] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isSidebarAcademicsOpen, setIsSidebarAcademicsOpen] = useState(true);
  
  // Resolve Flow States
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [roadmapData, setRoadmapData] = useState("");
  const [roadmapStatus, setRoadmapStatus] = useState<'idle' | 'checking' | 'prompt' | 'viewing' | 'generating'>('idle');
  
  // AI Chat State
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! I am Luminary AI. How can I assist you with your studies or curriculum today?' }
  ]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAIOpen) scrollToBottom();
  }, [chatMessages, isTyping, isAIOpen]);


  const [recentItems, setRecentItems] = useState<RecentItem[]>([
    { id: '1', title: 'OS_Memory_Nodes.pdf', subtitle: '1.2 MB', icon: 'picture_as_pdf', colorClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800' },
    { id: '2', title: 'Algo: Dynamic Prog', subtitle: '45 mins', icon: 'video_library', colorClass: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400' }
  ]);

  const handleAccess = (newItem: RecentItem) => {
    setRecentItems((prev: RecentItem[]) => {
      const filtered = prev.filter((item: RecentItem) => item.id !== newItem.id);
      return [newItem, ...filtered].slice(0, 4);
    });
  };

  useEffect(() => {
    setMounted(true);
    // Load users from localStorage
    const savedUsers = localStorage.getItem('luminary_users');
    if (savedUsers) {
      setUsersDB(JSON.parse(savedUsers));
    }
    
    // Auto-login if session exists
    const activeUserId = localStorage.getItem('luminary_active_user');
    if (activeUserId) {
      setIsAuthenticated(true);
      setCurrentUserId(parseInt(activeUserId, 10));
    }
  }, []);

  // Risk & Profile State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [riskData, setRiskData] = useState<any>(null);
  const [profile, setProfile] = useState({
    name: "Jane Scholar",
    location: "Main Campus",
    email: "jane.scholar@luminary.edu",
    phone: "+1 (555) 123-4567"
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetch(`http://localhost:8000/api/risk/predict/${currentUserId || "STU-101"}`)
      .then(res => res.json())
      .then(data => setRiskData(data))
      .catch(console.error);
    }
  }, [isAuthenticated, currentUserId]);

  const isRiskFound = DEMO_FORCE_RISK || riskData?.alert_trigger;

  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      fetch(`http://localhost:8000/api/dashboard/${currentUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === "success") {
            setDashboardData(data);
            setProfile(prev => ({
              ...prev,
              name: data.user.username,
              email: data.user.email
            }));
          }
        })
        .catch(console.error);
    }
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setLoginAttempts(0);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  const handleNavClick = (view: string) => {
    setCurrentView(view);
  };

  const submitChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, user_id: 'STU-101' })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.response || "Sorry, I couldn't process that request." }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Network error. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setAuthError("");
    setAuthSuccess("");

    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      
      if (res.ok && data.status === "success") {
        localStorage.setItem('luminary_active_user', data.user_id.toString());
        window.location.href = "/";
      } else {
        throw new Error(data.detail || "Authentication Failed");
      }
    } catch (err: any) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      setAuthError(err.message || "Invalid username or password.");
      if (newAttempts >= 3) {
        setIsLocked(true);
        setLockTimer(30);
        setAuthError(""); 
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           username: regUsername, 
           email: regUsername, 
           password: regPassword, 
           full_name: fullName,
           branch: branch
        })
      });
      const data = await res.json();
      
      if (res.ok && data.user_id) {
        localStorage.setItem('luminary_active_user', data.user_id.toString());
        window.location.href = "/onboarding";
      } else {
        throw new Error(data.detail || "Registration Failed");
      }
    } catch (err: any) {
      setAuthError(err.message || "Registration Failed");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsProfileOpen(false);
    setCurrentUserId(null);
    localStorage.removeItem('luminary_active_user');
    window.location.href = "/";
  };

  const triggerResolveFlow = () => {
    handleAccess({ id: 'risk', title: 'OS Risk Resolution', subtitle: 'Action Item', icon: 'warning', colorClass: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' });
    setIsResolveModalOpen(true);
    setRoadmapStatus('checking');
    fetch(`http://localhost:8000/api/risk/roadmap/check/${currentUserId || "1"}`)
      .then(res => res.json())
      .then(data => {
          if (data.has_saved) {
              setRoadmapData(data.roadmap);
              setRoadmapStatus('prompt');
          } else {
              generateNewRoadmap();
          }
      })
      .catch(err => {
          setRoadmapData("Failed to check roadmap status.");
          setRoadmapStatus('viewing');
      });
  };

  const generateNewRoadmap = () => {
      setRoadmapStatus('generating');
      fetch(`http://localhost:8000/api/risk/roadmap/generate/${currentUserId || "1"}`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
            setRoadmapData(data.roadmap);
            setRoadmapStatus('viewing');
        })
        .catch(err => {
            setRoadmapData("Failed to generate roadmap.");
            setRoadmapStatus('viewing');
        });
  };


  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300 font-body px-4 py-10">
        <div className="bg-white/90 dark:bg-slate-900/90 p-8 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/10 max-w-lg w-full backdrop-blur-xl">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
             <span className="material-symbols-outlined text-3xl">{isLoginMode ? 'lock' : 'person_add'}</span>
          </div>
          
          <h2 className="text-3xl font-headline font-bold text-slate-800 dark:text-gray-100 tracking-tight mb-2 text-center">
            {isLoginMode ? "Secure Entry" : "Create Account"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm text-center">
            {isLoginMode 
              ? "Access your luminary intelligence dashboard." 
              : "Register your student profile for intelligent tracking."}
          </p>

          {isLocked && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-3 animate-pulse">
              <span className="material-symbols-outlined">warning</span>
              Too many failed attempts. Please wait {lockTimer} seconds.
            </div>
          )}

          {authError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              {authError}
            </div>
          )}

          {authSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-3">
              <span className="material-symbols-outlined">check_circle</span>
              {authSuccess}
            </div>
          )}

          {isLoginMode ? (
            <form onSubmit={handleLogin} className="space-y-4">
               <div>
                 <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Username</label>
                 <input 
                  disabled={isLocked}
                  type="text" 
                  value={loginUsername} 
                  onChange={(e) => setLoginUsername(e.target.value)} 
                  placeholder="admin" 
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-4 rounded-xl outline-none focus:border-indigo-500 transition-colors text-slate-800 dark:text-gray-100 disabled:opacity-50" 
                 />
               </div>
               <div>
                 <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Password</label>
                 <input 
                  disabled={isLocked}
                  type="password" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-4 rounded-xl outline-none focus:border-indigo-500 transition-colors text-slate-800 dark:text-gray-100 disabled:opacity-50" 
                 />
               </div>
               <button 
                disabled={isLocked}
                type="submit" 
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Authenticate
               </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Full Name</label>
                   <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-indigo-500 transition-colors text-slate-800 dark:text-gray-100" />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Academic Branch</label>
                    <div className="relative">
                      <select 
                        required 
                        value={branch} 
                        onChange={(e) => setBranch(e.target.value)} 
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-3 pr-10 rounded-xl outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-gray-100 cursor-pointer appearance-none shadow-sm"
                      >
                        <option value="AIML">AIML (AI & Machine Learning)</option>
                        <option value="Computer Science Engineering">Computer Science Engineering (CSE)</option>
                        <option value="Information Technology">Information Technology (IT)</option>
                        <option value="Electronics & Communication">Electronics & Communication (ECE)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-sm">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Semester</label>
                    <input type="number" min="1" max="8" required value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-indigo-500 transition-colors text-slate-800 dark:text-gray-100" />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Username/Email</label>
                    <input type="text" required value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="jane.doe@edu.com" className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-indigo-500 transition-colors text-slate-800 dark:text-gray-100" />
                 </div>
               </div>
               <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Password Setup</label>
                  <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-indigo-500 transition-colors text-slate-800 dark:text-gray-100" />
               </div>
               <button type="submit" className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg text-lg">
                 Register Profile
               </button>
            </form>
          )}

          <div className="flex flex-col items-center gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
            <button onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(""); setAuthSuccess(""); }} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-all">
              {isLoginMode ? "Don't have an account? Register here" : "Already have an account? Login here"}
            </button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">{mounted && theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              Toggle {mounted && theme === 'dark' ? "Light" : "Dark"} Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  const uniqueCourseIds = new Set(dashboardData?.marks?.map((m: any) => m.course.id));
  const totalCourses = uniqueCourseIds.size || 0;
  const theoryMarks = dashboardData?.marks?.filter((m: any) => m.type === 'theory') || [];
  const labMarks = dashboardData?.marks?.filter((m: any) => m.type === 'lab') || [];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 font-body transition-colors duration-300">
      
      {/* Fixed Left Sidebar */}
      <aside className="w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 flex flex-col z-20 transition-all">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-white/5">
          <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[28px]">api</span> 
          <h1 className="font-headline font-bold text-xl tracking-tight text-slate-800 dark:text-gray-100">Luminary</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
           <button onClick={() => handleNavClick("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${currentView === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
             <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
           </button>
           
           <div className="pt-2">
             <button onClick={() => setIsSidebarAcademicsOpen(!isSidebarAcademicsOpen)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-gray-200 font-semibold text-sm">
               <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-[20px] text-slate-400">school</span> Academics
               </div>
               <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${isSidebarAcademicsOpen ? 'rotate-180' : ''}`}>expand_more</span>
             </button>
             
             {isSidebarAcademicsOpen && (
               <div className="pl-12 pr-2 py-2 space-y-1">
                   <Link href="/marks" onClick={() => { handleAccess({ id: 'nav-marks', title: 'Marks & Grades', subtitle: 'Academics View', icon: 'grade', colorClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' }); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ml-6 font-semibold ${currentView === 'marks' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300'}`}>
                     <span className="material-symbols-outlined text-[16px] text-indigo-500 dark:text-indigo-400">calculate</span>
                     Marks
                   </Link>
                   <Link href="/timetable" onClick={() => { handleAccess({ id: 'nav-timetable', title: 'Timetable', subtitle: 'Academics View', icon: 'calendar_month', colorClass: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' }); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ml-6 font-semibold ${currentView === 'timetable' ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300'}`}>
                     <span className="material-symbols-outlined text-[16px] text-teal-500 dark:text-teal-400">calendar_month</span>
                     Timetable
                   </Link>
                   <Link href="/assignments" onClick={() => { handleAccess({ id: 'nav-assignments', title: 'Assignments', subtitle: 'Academics View', icon: 'assignment', colorClass: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' }); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ml-6 font-semibold ${currentView === 'assignments' ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300'}`}>
                     <span className="material-symbols-outlined text-[16px] text-orange-500 dark:text-orange-400">assignment</span>
                     Assignments
                   </Link>
                   <Link href="/exams" onClick={() => { handleAccess({ id: 'nav-exams', title: 'Exams', subtitle: 'Academics View', icon: 'quiz', colorClass: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' }); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ml-6 font-semibold ${currentView === 'exams' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300'}`}>
                     <span className="material-symbols-outlined text-[16px] text-rose-500 dark:text-rose-400">history_edu</span>
                     Exams
                   </Link>
                   <Link href="/quizzes" onClick={() => { handleAccess({ id: 'nav-quizzes', title: 'Quizzes', subtitle: 'Academics View', icon: 'task', colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' }); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ml-6 font-semibold ${currentView === 'quizzes' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300'}`}>
                     <span className="material-symbols-outlined text-[16px] text-blue-500 dark:text-blue-400">quiz</span>
                     Quizzes
                   </Link>
               </div>
             )}
           </div>
        </div>
        
        <div className="p-4 pb-24 border-t border-slate-100 dark:border-white/5 mt-auto">
           <button 
             onClick={handleLogout} 
             className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
           >
             <span className="material-symbols-outlined text-[20px]">logout</span> 
             Logout
           </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm w-80 shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input className="bg-transparent border-none focus:outline-none w-full text-slate-700 dark:text-gray-200 placeholder-slate-400" placeholder="Omni-Search semantic core..." type="text"/>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 p-2 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-colors text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined text-[20px]">{mounted && theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <button 
              onClick={() => {
                setIsProfileOpen(true);
                handleAccess({ id: 'nav-profile', title: 'User Profile', subtitle: 'Settings & Info', icon: 'person', colorClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' });
              }}
              className="w-10 h-10 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center text-white shadow-md shadow-indigo-600/20"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </button>
          </div>
        </header>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-32 pt-6">
          
          {currentView === 'dashboard' ? (
            <div className="max-w-6xl mx-auto">
              {totalCourses === 0 && (
                <div className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-linear-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                      <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-headline mb-1">Welcome!</h2>
                      <p className="text-slate-600 dark:text-slate-300 max-w-lg">To unlock your intelligent roadmap and personalized curriculum analytics, please upload your academic syllabus.</p>
                    </div>
                  </div>
                  <Link href="/onboarding" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] shrink-0">
                    Upload Syllabus
                  </Link>
                </div>
              )}
              {/* Course Counter */}
              <div className="mb-6 flex items-center gap-2">
                 <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Total Enrolled Courses: {totalCourses}
                 </p>
              </div>

              {/* Main Grid: Courses */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Left/Main Column: Theory and Lab */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Top Row: Theory */}
                  <div>
                    <h3 className="font-headline text-lg font-bold tracking-tight mb-4 text-slate-800 dark:text-gray-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-500">book</span> Theory Courses
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {theoryMarks.map((mark: any) => (
                        <Link href={`/courses/${mark.course.id}`} key={mark.id} onClick={() => handleAccess({ id: `course-${mark.course.id}`, title: mark.course.title, subtitle: `${mark.course.code} Module`, icon: 'calculate', colorClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' })} className="block bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all hover:scale-[1.02] cursor-pointer">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-slate-800 dark:text-gray-100 line-clamp-1" title={mark.course.title}>{mark.course.title}</h4>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded">{mark.course.code}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-4">
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(mark.score / mark.max_score) * 100}%` }}></div>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">{Math.round((mark.score / mark.max_score) * 100)}%</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Row: Labs */}
                  <div>
                    <h3 className="font-headline text-lg font-bold tracking-tight mb-4 text-slate-800 dark:text-gray-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-500">science</span> Lab Courses
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {labMarks.map((mark: any) => (
                        <Link href={`/courses/${mark.course.id}`} key={mark.id} onClick={() => handleAccess({ id: `lab-${mark.course.id}`, title: mark.course.title, subtitle: `${mark.course.code}L`, icon: 'science', colorClass: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' })} className="block bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 hover:border-orange-300 dark:hover:border-orange-500/30 transition-all hover:scale-[1.02] cursor-pointer">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-slate-800 dark:text-gray-100 line-clamp-1" title={mark.course.title}>{mark.course.title} Lab</h4>
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded">{mark.course.code}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-4">
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(mark.score / mark.max_score) * 100}%` }}></div>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">{Math.round((mark.score / mark.max_score) * 100)}%</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Other Courses */}
                <div className="lg:col-span-1">
                  <h3 className="font-headline text-lg font-bold tracking-tight mb-4 text-slate-800 dark:text-gray-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500">emoji_objects</span> Other Courses
                  </h3>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-4">
                    <div onClick={() => handleAccess({ id: 'ethics', title: 'Ethics in Tech', subtitle: 'Awaiting Assignment 1', icon: 'gavel', colorClass: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' })} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all">
                       <span className="material-symbols-outlined text-rose-500 bg-rose-100 dark:bg-rose-500/20 p-2 rounded-lg">history_edu</span>
                       <div>
                         <p className="font-bold text-slate-800 dark:text-gray-100 text-sm">Ethics in Tech</p>
                         <p className="text-xs text-slate-500">Awaiting Assignment 1</p>
                       </div>
                    </div>
                    <div onClick={() => handleAccess({ id: 'pm', title: 'Project Mgmt', subtitle: 'Phase 2 Ongoing', icon: 'developer_board', colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' })} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all">
                       <span className="material-symbols-outlined text-blue-500 bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg">integration_instructions</span>
                       <div>
                         <p className="font-bold text-slate-800 dark:text-gray-100 text-sm">Project Mgmt</p>
                         <p className="text-xs text-slate-500">Phase 2 Ongoing</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Banner */}
              <div className="w-full bg-linear-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-lg mb-8 relative overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
                 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h2 className="font-headline text-3xl font-bold tracking-tight mb-1">Course Registration</h2>
                      <p className="text-indigo-100 font-medium group-hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">list_alt</span> View list of all available elective courses</p>
                    </div>
                    <button onClick={() => handleAccess({ id: 'reg', title: 'Course Registration Portal', subtitle: 'System', icon: 'app_registration', colorClass: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' })} className="bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl shadow-sm hover:scale-105 transition-transform flex items-center gap-2">
                      Open Portal <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </button>
                 </div>
                 <span className="material-symbols-outlined absolute -right-6 -bottom-8 text-[140px] text-white/10 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">how_to_reg</span>
              </div>

              {/* 50/50 Split: Risk Radar & Record Mark */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                 {/* Risk Radar */}
                 <div className={`p-8 rounded-3xl shadow-sm border transition-all duration-500 ${isRiskFound ? 'bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-500/30 shadow-red-500/10' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className={`font-headline text-xl font-bold tracking-tight flex items-center gap-2 ${isRiskFound ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-gray-100'}`}>
                        <span className="material-symbols-outlined">radar</span> Risk Radar
                      </h4>
                      {isRiskFound ? (
                        <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                          CRITICAL
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200 dark:border-emerald-500/30">
                          Stable
                        </div>
                      )}
                    </div>
                    
                    <p className={`text-sm leading-relaxed mb-6 ${isRiskFound ? 'text-red-900/80 dark:text-red-200/80 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isRiskFound ? 
                        (DEMO_FORCE_RISK ? "CRITICAL: Multiple modules are currently below passing trajectory. Immediate curriculum intervention is recommended to recover academic standing." : riskData?.details) 
                        : 'Analyzing curriculum velocity models. No significant risk detected across enrolled modules.'}
                    </p>
                    
                    {isRiskFound && (
                        <button 
                          onClick={triggerResolveFlow} 
                          className="group relative w-full overflow-hidden rounded-2xl bg-linear-to-r from-red-600 to-orange-600 p-[1.5px] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-600/30"
                        >
                            <div className="relative flex items-center justify-center gap-3 bg-red-600 px-6 py-4 rounded-[14px] transition-colors group-hover:bg-transparent">
                                <span className="material-symbols-outlined text-white text-[20px] animate-spin-slow">auto_awesome</span>
                                <span className="font-bold text-white text-sm">Generate Resolve Roadmap ✨</span>
                            </div>
                            <div className="absolute inset-0 animate-pulse bg-white/20"></div>
                        </button>
                    )}
                 </div>

                 {/* Record New Mark */}
                 <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex justify-center items-center mb-4">
                       <span className="material-symbols-outlined text-[32px]">note_add</span>
                    </div>
                    <h3 className="font-headline text-xl font-bold tracking-tight mb-2">Record New Marks</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Log assignments, term test results, and exam scores manually into predicting layers.</p>
                    <button onClick={() => setIsMarksOpen(true)} className="w-full bg-slate-900 dark:bg-white dark:hover:bg-slate-200 hover:bg-slate-800 text-white dark:text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-md">
                      <span className="material-symbols-outlined text-[20px]">add</span> Add Entry
                    </button>
                  </div>
               </div>


              {/* 100% Width Recently Accessed */}
              <div className="w-full">
                <h3 className="font-headline text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400">schedule</span> Recently Accessed
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                  {recentItems.map((item) => (
                    <div key={item.id} className="min-w-[280px] bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 flex items-center gap-4 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.colorClass}`}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center py-20">
               <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-6">
                 <span className="material-symbols-outlined text-5xl">construction</span>
               </div>
               <h2 className="text-3xl font-headline font-bold mb-2 capitalize">{currentView} Explorer</h2>
               <p className="text-slate-500 dark:text-slate-400">This module view is currently under development.</p>
               <button onClick={() => setCurrentView('dashboard')} className="mt-8 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow hover:bg-indigo-700 transition">Return to Dashboard</button>
            </div>
          )}
          
        </div>
      </main>

      {/* Floating AI Chatbot Component */}
      <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-4">
         {!isAIOpen && (
           <div className="cursor-pointer bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-4 rounded-2xl rounded-br-sm border border-slate-200 dark:border-white/10 shadow-xl max-w-[240px] animate-pulse" onClick={() => setIsAIOpen(true)}>
              <p className="text-sm font-medium text-slate-700 dark:text-gray-200 leading-relaxed">System active. Need to query the knowledge graph?</p>
           </div>
         )}
         
         {isAIOpen && (
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl w-80 h-96 flex flex-col overflow-hidden mb-2 animate-in slide-in-from-bottom-5">
              <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <span className="material-symbols-outlined rounded-full bg-white/20 p-1 text-sm">smart_toy</span>
                   <span className="font-bold">Luminary AI</span>
                </div>
                <button onClick={() => setIsAIOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><span className="material-symbols-outlined text-sm">close</span></button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3">
                {chatMessages.map((msg: {role: string; text: string}, i: number) => (
                  <div key={i} className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white self-end rounded-br-sm max-w-[80%]' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-gray-100 self-start border border-slate-100 dark:border-white/5 rounded-bl-sm max-w-[85%] shadow-sm'}`}>
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="p-3 rounded-2xl text-sm bg-white dark:bg-slate-800 text-slate-500 italic self-start border border-slate-100 dark:border-white/5 rounded-bl-sm shadow-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    Luminary AI is thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={submitChat} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  disabled={isTyping}
                  placeholder="Ask me anything..." 
                  className="w-full bg-slate-100 dark:bg-slate-800 text-sm px-4 py-2 rounded-full focus:outline-none text-slate-900 dark:text-gray-100 border border-transparent focus:border-indigo-500/50"
                />
                <button type="submit" disabled={isTyping || !chatInput.trim()} className="w-9 h-9 bg-indigo-600 text-white shrink-0 rounded-full flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </form>
           </div>
         )}

         <button onClick={() => setIsAIOpen(!isAIOpen)} className="w-14 h-14 bg-slate-900 dark:bg-indigo-500 hover:bg-slate-800 dark:hover:bg-indigo-400 transition-transform hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-2xl border border-white/10">
            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>{isAIOpen ? 'close' : 'smart_toy'}</span>
         </button>
      </div>

      {/* Profile Drawer Component */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsProfileOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col pt-16 px-8 pb-8 animate-in slide-in-from-right overflow-y-auto border-l border-slate-200 dark:border-white/10">
            <button onClick={() => setIsProfileOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-8">Your Profile</h2>
            
            <div className="space-y-5 mb-8">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Full Name</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-gray-100 p-3 rounded-xl border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={profile.name} onChange={(e)=>setProfile({...profile, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Location</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-gray-100 p-3 rounded-xl border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={profile.location} onChange={(e)=>setProfile({...profile, location: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Email</label>
                <input type="email" className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-gray-100 p-3 rounded-xl border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={profile.email} onChange={(e)=>setProfile({...profile, email: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Phone</label>
                <input type="tel" className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-gray-100 p-3 rounded-xl border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={profile.phone} onChange={(e)=>setProfile({...profile, phone: e.target.value})} />
              </div>
            </div>

            <div className="mt-auto space-y-3 pt-8 border-t border-slate-100 dark:border-white/10">
              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-colors flex justify-center items-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">sync</span> Sync Profile
              </button>
              <button onClick={handleLogout} className="w-full py-3 bg-white dark:bg-transparent border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                 Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Marks Modal */}
      {isMarksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setIsMarksOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 text-slate-900 dark:text-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-2xl font-bold tracking-tight">Record Score</h3>
              <button onClick={() => setIsMarksOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="space-y-5 mb-8">
              <div>
                <label className="text-[10px] tracking-widest uppercase font-bold text-slate-500 mb-1.5 block">Subject Focus</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-gray-100 p-3 flex rounded-xl border border-slate-200 dark:border-white/5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                  <option>Engineering Mathematics</option>
                  <option>Operating Systems</option>
                  <option>Algorithms</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] tracking-widest uppercase font-bold text-slate-500 mb-1.5 block">Exam Type</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-gray-100 p-3 rounded-xl border border-slate-200 dark:border-white/5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                  <option>Quiz</option>
                  <option>Midterm</option>
                  <option>Final</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] tracking-widest uppercase font-bold text-slate-500 mb-1.5 block">Final Score</label>
                <input type="number" placeholder="0-100" className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-gray-100 p-3 rounded-xl border border-slate-200 dark:border-white/5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-600" />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setIsMarksOpen(false)} className="flex-1 py-3 rounded-xl font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-gray-300">Cancel</button>
              <button onClick={() => setIsMarksOpen(false)} className="flex-1 py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Flow Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity" onClick={() => setIsResolveModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col max-h-[80vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 text-slate-900 dark:text-gray-100">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                   <span className="material-symbols-outlined">smart_toy</span>
                 </div>
                 <h3 className="font-headline text-2xl font-bold tracking-tight">AI Recovery Roadmap</h3>
               </div>
               <button onClick={() => setIsResolveModalOpen(false)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
               {roadmapStatus === 'checking' && (
                 <div className="flex flex-col items-center justify-center py-12">
                   <span className="material-symbols-outlined animate-spin text-4xl text-indigo-500 mb-4">progress_activity</span>
                   <p className="font-semibold uppercase tracking-widest text-slate-500 text-xs">Checking Systems...</p>
                 </div>
               )}
               
               {roadmapStatus === 'prompt' && (
                 <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto">
                   <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-[32px]">history</span>
                   </div>
                   <h4 className="text-xl font-bold mb-4">Saved Roadmap Found</h4>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">We found a saved recovery roadmap for you. Would you like to view it, or generate a new one based on your latest grades?</p>
                   
                   <div className="flex flex-col sm:flex-row gap-3 w-full">
                     <button onClick={() => setRoadmapStatus('viewing')} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">View Saved</button>
                     <button onClick={generateNewRoadmap} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition-colors">Generate New</button>
                   </div>
                 </div>
               )}

               {roadmapStatus === 'generating' && (
                 <div className="flex flex-col items-center justify-center py-12">
                   <span className="material-symbols-outlined animate-spin text-4xl text-indigo-500 mb-4">progress_activity</span>
                   <p className="font-semibold uppercase tracking-widest text-slate-500 text-xs">Generating Recovery Plan...</p>
                 </div>
               )}

               {roadmapStatus === 'viewing' && (
                 <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-headline prose-p:leading-relaxed prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
                   <ReactMarkdown>{roadmapData}</ReactMarkdown>
                 </div>
               )}
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
               <button onClick={() => setIsResolveModalOpen(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl transition-colors shadow-sm">{roadmapStatus === 'prompt' ? 'Cancel' : 'Acknowledge'}</button>
            </div>
          </div>
        </div>
      )}

      <Navigator 
        onOpenProfile={() => setIsProfileOpen(true)} 
        onNavigate={(view) => handleNavClick(view)}
      />

    </div>
  );
}
