import Link from "next/link";

export default function AssignmentsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-6 font-body">
      <div className="bg-white/90 dark:bg-slate-900/90 p-10 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/10 max-w-lg w-full text-center backdrop-blur-xl">
        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600 dark:text-orange-400">
           <span className="material-symbols-outlined text-4xl">assignment</span>
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight mb-2 text-slate-800 dark:text-gray-100">Assignments</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">This section is currently under development.</p>
        <Link href="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
