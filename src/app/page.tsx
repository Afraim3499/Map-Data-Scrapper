import Link from 'next/link';

export const metadata = {
  title: 'TorQi Territory Builder | Sales Lead Intelligence',
  description: 'Turn Google Maps business data into an enriched, scored, CSV-ready lead database for TorQi\'s auto repair sales team.',
};

export default function LandingPage() {
  const stats = [
    { label: 'Shops Discovered', value: '1,842', desc: 'Total local listings located' },
    { label: 'Qualified Leads', value: '913', desc: 'Grade A & B sales targets' },
    { label: 'After-Hours Gaps', value: '613', desc: 'Early closes & weekend leaks' },
    { label: 'Software Signals', value: '91', desc: 'Tekmetric, Shopmonkey, etc.' },
  ];

  const buckets = [
    {
      title: 'After-Hours Revenue Leak',
      badge: 'High Value',
      desc: 'Shops closing before 6:00 PM or closed on weekends. These shops miss towing emergencies and evening booking requests. TorQi AI voice handles their calls 24/7.',
      icon: '🕒',
    },
    {
      title: 'Busy Desk / High-Volume Shop',
      badge: 'Hot Lead',
      desc: 'Shops with 300+ reviews and 4.5+ ratings. Their front desks are overwhelmed during peak morning drop-offs. TorQi automates routine bookings to relieve service advisors.',
      icon: '🔥',
    },
    {
      title: 'Pre-Integrated Software Fit',
      badge: 'Fast Onboarding',
      desc: 'Shops utilizing Tekmetric, Shopmonkey, or Shop-Ware. TorQi integrates directly with their existing workflow to record appointments without manual entry.',
      icon: '💻',
    },
    {
      title: 'No Text / Weak Digital Intake',
      badge: 'Easy Hook',
      desc: 'Shops reliant purely on standard telephone intake with no text-to-shop capability. TorQi enables instant mobile text bookings for mobile-first vehicle owners.',
      icon: '💬',
    },
    {
      title: 'Weak Website Conversion Flow',
      badge: 'Website Exist',
      desc: 'Shops with a website but no clear booking calls-to-action or scheduling portals. TorQi places an interactive agent on their site to capture website visitors.',
      icon: '🕸️',
    },
  ];

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-white/5 glass-panel py-5 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-extrabold tracking-wider text-white flex items-center gap-1.5">
            TorQi <span className="text-glow text-[#FF5C00] font-medium text-xs tracking-normal px-2 py-0.5 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/20">TERRITORY BUILDER</span>
          </h1>
        </div>
        <Link 
          href="/dashboard" 
          className="px-5 py-2.5 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-semibold tracking-wide border-glow transition-all duration-200"
        >
          Launch Dashboard
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center px-6 py-16 sm:py-24 text-center max-w-7xl mx-auto w-full">
        {/* Sub-header badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-xs text-[#FF5C00] font-semibold tracking-wide uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-ping"></span>
          Sales Intelligence Platform
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight mb-6">
          Turn Google Maps Data Into A <span className="bg-gradient-to-r from-slate-950 via-slate-800 to-[#FF5C00] bg-clip-text text-transparent">Scored, CSV-Ready</span> Lead Pipeline
        </h2>

        <p className="text-lg text-slate-400 max-w-2xl leading-relaxed mb-12">
          Discover auto repair shops, dealerships, and collision centers. Scan their websites, identify shop management software, audit after-hours gaps, and generate data-backed sales scripts.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20 w-full sm:w-auto">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold tracking-wide border-glow transition-all duration-200 shadow-lg flex items-center justify-center gap-2 group"
          >
            Enter Dashboard 
            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <a 
            href="#lead-buckets" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl glass-panel hover:bg-white/5 text-slate-300 font-semibold tracking-wide transition-all"
          >
            Explore Lead Gaps
          </a>
        </div>

        {/* Marketing Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl mb-24">
          {stats.map((stat, i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 text-center border-l-2 border-l-[#FF5C00]/60">
              <span className="block text-3xl sm:text-4xl font-extrabold text-white mb-1">{stat.value}</span>
              <span className="block text-sm font-semibold text-slate-300 mb-0.5">{stat.label}</span>
              <span className="block text-xs text-slate-500">{stat.desc}</span>
            </div>
          ))}
        </div>

        {/* Gaps / Lead Buckets Section */}
        <section id="lead-buckets" className="w-full text-left max-w-5xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Our 5 Core Lead Gaps</h3>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              We score and organize leads into actionable pitches based on their operational and digital shortcomings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buckets.map((bucket, i) => (
              <div 
                key={i} 
                className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{bucket.icon}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-400">
                      {bucket.badge}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{bucket.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{bucket.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600 glass-panel">
        <p>© {new Date().getFullYear()} TorQi Territory Builder. Internal Sales tool. Unauthorized sharing is strictly prohibited.</p>
      </footer>
    </div>
  );
}
