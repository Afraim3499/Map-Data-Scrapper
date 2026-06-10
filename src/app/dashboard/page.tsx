import Link from 'next/link';
import { prisma } from '@/lib/db';

export const revalidate = 0; // Disable caching for real-time dashboard updates

export default async function DashboardPage() {
  // Fetch campaigns
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Calculate aggregates
  const totalCampaigns = campaigns.length;
  
  const totalLeads = await prisma.lead.count();
  
  const totalQualified = await prisma.lead.count({
    where: {
      leadScores: {
        some: {
          leadGrade: { in: ['A', 'B'] },
        },
      },
    },
  });

  const totalAfterHours = await prisma.lead.count({
    where: { afterHoursGap: true },
  });

  const totalSoftware = await prisma.lead.count({
    where: {
      websiteScans: {
        some: {
          detectedSoftware: { not: null },
        },
      },
    },
  });

  const totalDownloads = await prisma.export.count();

  // Status Badge styles
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
      case 'queued':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'discovering_places':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';
      case 'deduplicating':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse';
      case 'fetching_details':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20 animate-pulse';
      case 'scanning_websites':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse';
      case 'scoring_leads':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse';
      case 'complete':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'paused':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cancelled':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const statCards = [
    { label: 'Total Campaigns', value: totalCampaigns, desc: 'Territories targeted' },
    { label: 'Total Leads', value: totalLeads, desc: 'Businesses discovered' },
    { label: 'Qualified Leads', value: totalQualified, desc: 'A & B grade targets' },
    { label: 'After-Hours Gaps', value: totalAfterHours, desc: 'Revenue leak targets' },
    { label: 'Software Signals', value: totalSoftware, desc: 'SMS/Widget indicators' },
    { label: 'CSV Downloads', value: totalDownloads, desc: 'Active pipeline exports' },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Top section with action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Territory Campaigns</h2>
          <p className="text-slate-400 text-xs mt-1">Manage and track your Google Maps discovery and website enrichment tasks.</p>
        </div>
        <Link 
          href="/dashboard/new-campaign"
          className="px-5 py-3 rounded-xl bg-[#FF002E] hover:bg-[#E60029] text-white text-sm font-bold tracking-wide border-glow transition-all"
        >
          + New Campaign
        </Link>
      </div>

      {/* Grid of aggregates */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="glass-panel rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">{card.label}</span>
              <span className="block text-2xl font-extrabold text-white mt-2 mb-1">{card.value}</span>
            </div>
            <span className="block text-[10px] text-slate-500">{card.desc}</span>
          </div>
        ))}
      </div>

      {/* Campaigns Table Panel */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
        <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
          <h3 className="text-base font-bold text-white">Campaign Directory</h3>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl">📭</span>
            <h4 className="text-white font-bold text-lg mt-4 mb-2">No campaigns yet</h4>
            <p className="text-slate-400 text-xs max-w-sm mx-auto mb-6">Create your first territory builder campaign to fetch business details and crawl websites from Google Maps.</p>
            <Link 
              href="/dashboard/new-campaign"
              className="px-5 py-2.5 rounded-lg bg-[#FF002E] hover:bg-[#E60029] text-white text-xs font-semibold border-glow transition-all inline-block"
            >
              Build Territory
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse custom-table">
              <thead>
                <tr>
                  <th className="px-6 py-4">Campaign Name</th>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Progress</th>
                  <th className="px-6 py-4 text-right">Qualified Leads</th>
                  <th className="px-6 py-4 text-right">Created At</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 text-xs">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4.5 font-bold text-white">
                      <Link href={`/dashboard/campaigns/${c.id}`} className="hover:text-[#FF002E] transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4.5">{c.state}</td>
                    <td className="px-6 py-4.5 font-medium">{c.businessCategory}</td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold border ${getStatusBadgeClass(c.status)}`}>
                        {formatStatus(c.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right font-mono text-slate-400">
                      {c.status === 'complete' ? (
                        <span className="text-green-400 font-bold">100% ({c.totalEnriched})</span>
                      ) : c.status === 'draft' ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <span>
                          {c.processedZips}/{c.totalZips} ZIPs
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      {c.status === 'complete' ? (
                        <span className="font-bold text-[#FF002E]">{c.totalQualified} / {c.totalEnriched}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-right text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <Link 
                        href={`/dashboard/campaigns/${c.id}`}
                        className="px-3 py-1.5 rounded bg-white/5 hover:bg-[#FF002E] border border-white/10 hover:border-[#FF002E] hover:text-white text-slate-300 text-[10px] font-bold transition-all inline-block"
                      >
                        Open Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
