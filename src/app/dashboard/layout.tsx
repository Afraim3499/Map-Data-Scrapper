import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-white/5 glass-panel py-4 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <h1 className="text-base font-extrabold tracking-wider text-white">
              TorQi <span className="text-glow text-[#FF5C00] font-medium text-[10px] tracking-normal px-2 py-0.5 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/20">TERRITORY BUILDER</span>
            </h1>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Campaigns
            </Link>
            <Link 
              href="/dashboard/logs" 
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Scan Logs
            </Link>
            <Link 
              href="/dashboard/settings" 
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Settings
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            ← Marketing Home
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Mobile Nav Bar */}
        <nav className="md:hidden flex items-center justify-around py-3 px-4 rounded-xl glass-panel mb-6">
          <Link 
            href="/dashboard" 
            className="text-xs font-bold text-slate-300 hover:text-white"
          >
            Campaigns
          </Link>
          <Link 
            href="/dashboard/logs" 
            className="text-xs font-bold text-slate-300 hover:text-white"
          >
            Scan Logs
          </Link>
          <Link 
            href="/dashboard/settings" 
            className="text-xs font-bold text-slate-300 hover:text-white"
          >
            Settings
          </Link>
        </nav>
        
        {children}
      </div>
    </div>
  );
}
