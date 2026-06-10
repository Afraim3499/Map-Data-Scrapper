'use strict';
'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Log {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  state: string;
  businessCategory: string;
  searchQueries: string;
  status: string;
  totalZips: number;
  processedZips: number;
  totalPlaceIds: number;
  uniquePlaceIds: number;
  totalEnriched: number;
  totalScanned: number;
  totalQualified: number;
  createdAt: string;
  completedAt: string | null;
}

interface Lead {
  id: string;
  placeId: string;
  businessName: string;
  phoneRaw: string | null;
  phoneFormatted: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  rating: number | null;
  reviewCount: number | null;
  hoursSummary: string | null;
  closesBefore6: boolean;
  closedSaturday: boolean;
  closedSunday: boolean;
  weekdayCloseTime: string | null;
  googleMapsUrl: string | null;
  score?: {
    torqiFitScore: number;
    leadGrade: string;
    dataConfidenceScore: number;
    primaryBucket: string | null;
    secondaryBuckets: string | null;
    salesHook: string | null;
    openingLine: string | null;
    outreachPriority: string;
    scoreBreakdownJson: string;
  } | null;
  scan?: {
    scanStatus: string;
    httpStatus: number | null;
    homepageTitle: string | null;
    pagesScanned: number;
    bookingFlowStrength: string;
    textCapability: string;
    textEvidence: string | null;
    chatWidgetFound: boolean;
    chatWidgetName: string | null;
    detectedSoftware: string | null;
    softwareConfidence: string | null;
    softwareEvidence: string | null;
    evidenceUrl: string | null;
    rawSignalsJson: string | null;
  } | null;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // States
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState({ leads: 0, qualified: 0, afterHours: 0, softwareSignals: 0 });
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // UI Controls
  const [activeTab, setActiveTab] = useState<'leads' | 'analytics' | 'logs' | 'export'>('leads');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters for Leads Table
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterBucket, setFilterBucket] = useState('');
  const [filterSoftware, setFilterSoftware] = useState('');
  const [sort, setSort] = useState('score_desc');

  // Exports State
  const [selectedExportFormat, setSelectedExportFormat] = useState('sales');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  // Fetch Campaign details
  const fetchCampaignData = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (!res.ok) throw new Error('Failed to fetch campaign details');
      const data = await res.json();
      setCampaign(data.campaign);
      setLogs(data.logs);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Campaign Leads
  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        grade: filterGrade,
        bucket: filterBucket,
        software: filterSoftware,
        sort,
      });
      const res = await fetch(`/api/campaigns/${id}/leads?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Poll for campaign status if active
  useEffect(() => {
    fetchCampaignData();
    const interval = setInterval(async () => {
      if (campaign && ['queued', 'discovering_places', 'deduplicating', 'fetching_details', 'scanning_websites', 'scoring_leads'].includes(campaign.status)) {
        try {
          // Trigger a processing tick to keep the campaign moving on serverless platforms (Vercel)
          await fetch(`/api/campaigns/${id}/scan-tick`, { method: 'POST' });
        } catch (err) {
          console.error('Failed to trigger scan tick:', err);
        }
        fetchCampaignData();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [campaign?.status]);

  // Refetch leads when filters change
  useEffect(() => {
    fetchLeads();
  }, [id, search, filterGrade, filterBucket, filterSoftware, sort]);

  // Lifecycle actions
  const triggerAction = async (action: 'start' | 'pause' | 'resume' | 'cancel') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || `Failed to ${action} campaign.`);
      }
      await fetchCampaignData();
      fetchLeads();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger manual website batch crawls
  const triggerBatchScans = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/scan-websites`, { method: 'POST' });
      if (res.ok) {
        alert('Batch website scan started in the background.');
      } else {
        alert('Failed to start batch website scans.');
      }
      fetchCampaignData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger single lead rescan
  const triggerLeadRescan = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/rescan-website`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to rescan lead website');
      const data = await res.json();
      
      // Update local state
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, scan: data.scan, score: data.score } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, scan: data.scan, score: data.score });
      }
      
      fetchCampaignData();
    } catch (err: any) {
      alert(err.message || 'Failed to rescan lead.');
    }
  };

  // Export CSV Action
  const handleExport = async () => {
    setExporting(true);
    setExportMessage('');
    try {
      const res = await fetch(`/api/campaigns/${id}/export/${selectedExportFormat}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to generate export file');
      const exportRecord = await res.json();
      
      // Open download URL
      window.open(`/api/exports/${exportRecord.id}/download`, '_blank');
      setExportMessage(`Success! Generated ${exportRecord.rowCount} rows.`);
      fetchCampaignData();
    } catch (err: any) {
      setExportMessage('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Calculate Progress Percentages
  const getProgressPercentage = () => {
    if (!campaign) return 0;
    switch (campaign.status) {
      case 'draft':
      case 'queued':
        return 5;
      case 'discovering_places':
        return Math.round((campaign.processedZips / Math.max(1, campaign.totalZips)) * 40);
      case 'deduplicating':
        return 45;
      case 'fetching_details':
        return 45 + Math.round((campaign.totalEnriched / Math.max(1, campaign.uniquePlaceIds)) * 25);
      case 'scanning_websites':
        return 70 + Math.round((campaign.totalScanned / Math.max(1, campaign.totalEnriched)) * 20);
      case 'scoring_leads':
        return 95;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
      case 'queued': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'discovering_places': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';
      case 'deduplicating': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse';
      case 'fetching_details': return 'bg-pink-500/10 text-pink-400 border-pink-500/20 animate-pulse';
      case 'scanning_websites': return 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse';
      case 'scoring_leads': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse';
      case 'complete': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cancelled': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-[#FF002E]/20 text-[#FF002E] border-[#FF002E]/40 font-bold';
      case 'B': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'C': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'D': return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
      default: return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
    }
  };

  // Compile Distributions for Charts
  const getAnalytics = () => {
    const grades = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
    const buckets = {} as Record<string, number>;
    const software = {} as Record<string, number>;

    leads.forEach(l => {
      if (l.score) {
        grades[l.score.leadGrade] = (grades[l.score.leadGrade] || 0) + 1;
        if (l.score.primaryBucket) {
          buckets[l.score.primaryBucket] = (buckets[l.score.primaryBucket] || 0) + 1;
        }
      }
      if (l.scan && l.scan.detectedSoftware) {
        software[l.scan.detectedSoftware] = (software[l.scan.detectedSoftware] || 0) + 1;
      } else {
        software['None'] = (software['None'] || 0) + 1;
      }
    });

    return { grades, buckets, software };
  };

  if (loading || !campaign) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-[#FF002E] animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-xs font-mono">Loading campaign parameters...</p>
        </div>
      </div>
    );
  }

  const { grades, buckets, software } = getAnalytics();

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Back navigation */}
      <Link 
        href="/dashboard" 
        className="text-xs text-slate-400 hover:text-white transition-colors mb-2 inline-block self-start"
      >
        ← Back to Campaigns
      </Link>

      {/* Hero detail section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Campaign Info card */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${getStatusBadgeClass(campaign.status)} mb-2`}>
                {campaign.status.replace(/_/g, ' ')}
              </span>
              <h2 className="text-xl font-extrabold text-white">{campaign.name}</h2>
              <p className="text-slate-400 text-xs mt-1">
                State: <strong className="text-slate-200">{campaign.state}</strong> | 
                Category: <strong className="text-slate-200">{campaign.businessCategory}</strong>
              </p>
            </div>

            {/* Controller buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {campaign.status === 'draft' && (
                <button
                  onClick={() => triggerAction('start')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-[#FF002E] hover:bg-[#E60029] text-white text-xs font-bold border-glow transition-all"
                >
                  Start Scrape Grid
                </button>
              )}

              {['queued', 'discovering_places', 'deduplicating', 'fetching_details', 'scanning_websites', 'scoring_leads'].includes(campaign.status) && (
                <>
                  <button
                    onClick={() => triggerAction('pause')}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => triggerAction('cancel')}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-white/5 transition-all"
                  >
                    Cancel
                  </button>
                </>
              )}

              {(campaign.status === 'paused' || campaign.status === 'failed') && (
                <>
                  <button
                    onClick={() => triggerAction('resume')}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-slate-950 text-xs font-bold transition-all"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => triggerAction('cancel')}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-white/5 transition-all"
                  >
                    Cancel
                  </button>
                </>
              )}

              {campaign.status === 'complete' && (
                <>
                  <button
                    onClick={triggerBatchScans}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all"
                  >
                    Batch Web Crawl
                  </button>
                  <button
                    onClick={() => triggerAction('start')}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-[#FF002E]/10 hover:bg-[#FF002E]/20 text-[#FF002E] border border-[#FF002E]/30 text-xs font-bold transition-all"
                  >
                    Restart Scrape
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {campaign.status !== 'draft' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase font-bold">Grid Progress</span>
                <span className="text-white font-bold">{getProgressPercentage()}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 border border-white/5 overflow-hidden">
                <style>{`
                  #progress-bar-${campaign.id} {
                    width: ${getProgressPercentage()}%;
                  }
                `}</style>
                <div 
                  id={`progress-bar-${campaign.id}`}
                  className="h-full rounded-full bg-gradient-to-r from-[#FF002E]/80 to-[#FF002E] border-r border-[#FF002E] transition-all duration-500" 
                ></div>
              </div>

              {/* Incremental state counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-center border-t border-white/5">
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">ZIPs Checked</span>
                  <span className="text-base font-extrabold text-white mt-1 block">
                    {campaign.processedZips} / {campaign.totalZips}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Raw Places</span>
                  <span className="text-base font-extrabold text-white mt-1 block">{campaign.totalPlaceIds}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Unique Leads</span>
                  <span className="text-base font-extrabold text-white mt-1 block">
                    {campaign.totalEnriched} / {campaign.uniquePlaceIds}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Scanned Sites</span>
                  <span className="text-base font-extrabold text-white mt-1 block">{campaign.totalScanned}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Campaign Metrics summary cards */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Campaign Intelligence</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">Qualified Targets</span>
              <span className="text-2xl font-extrabold text-[#FF002E] block mt-1">{stats.qualified}</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">Total Scanned</span>
              <span className="text-2xl font-extrabold text-white block mt-1">{stats.leads}</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">After-Hours</span>
              <span className="text-2xl font-extrabold text-amber-400 block mt-1">{stats.afterHours}</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">Software Signals</span>
              <span className="text-2xl font-extrabold text-cyan-400 block mt-1">{stats.softwareSignals}</span>
            </div>
          </div>

          <span className="block text-[10px] text-slate-500 italic text-center">
            * Qualified represents A & B letter grade leads.
          </span>
        </div>
      </div>

      {/* Tabs selector */}
      <div className="flex border-b border-white/5">
        {[
          { id: 'leads', label: 'Leads Directory' },
          { id: 'analytics', label: 'Charts & Analytics' },
          { id: 'logs', label: 'Execution Logs' },
          { id: 'export', label: 'Export Center' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 text-xs font-bold tracking-wider transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'border-[#FF002E] text-white bg-white/[0.01]' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[400px] flex flex-col">
        {/* Tab 1: Leads Directory */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filters panel */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input 
                type="text"
                placeholder="Search name, phone, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 focus:border-[#FF002E] text-white text-xs outline-none transition-all sm:col-span-2"
              />

              <select 
                value={filterGrade} 
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-white text-xs outline-none focus:border-[#FF002E]"
                title="Filter by Letter Grade"
              >
                <option value="">All Letter Grades</option>
                <option value="A">Grade A Only</option>
                <option value="B">Grade B Only</option>
                <option value="C">Grade C Only</option>
                <option value="D">Grade D Only</option>
              </select>

              <select 
                value={filterBucket} 
                onChange={(e) => setFilterBucket(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-white text-xs outline-none focus:border-[#FF002E]"
                title="Filter by Core Gap"
              >
                <option value="">All Core Gaps</option>
                <option value="After-Hours Revenue Leak">After-Hours Leak</option>
                <option value="Busy Desk / High-Volume Shop">Busy Desk</option>
                <option value="Pre-Integrated Software Fit">Software Fit</option>
                <option value="No Text / Weak Digital Intake">Weak Intake</option>
                <option value="Website Exists, But Conversion Flow Is Weak">Weak Website Flow</option>
              </select>

              <select 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-white text-xs outline-none focus:border-[#FF002E]"
                title="Sort Leads"
              >
                <option value="score_desc">Fit Score: High to Low</option>
                <option value="score_asc">Fit Score: Low to High</option>
                <option value="name_asc">Alphabetical: A to Z</option>
                <option value="name_desc">Alphabetical: Z to A</option>
                <option value="reviews_desc">Reviews: High to Low</option>
                <option value="rating_desc">Rating: High to Low</option>
              </select>
            </div>

            {/* Leads Table Panel */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              {loadingLeads ? (
                <div className="text-center py-20">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-[#FF002E] animate-spin mx-auto mb-2"></div>
                  <span className="text-slate-500 text-[10px] font-mono">Filtering lead catalog...</span>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-xs">
                  No leads discovered yet, or none match your filter rules.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse custom-table">
                    <thead>
                      <tr>
                        <th className="px-6 py-4">Business Name</th>
                        <th className="px-6 py-4">Grade</th>
                        <th className="px-6 py-4">Fit Score</th>
                        <th className="px-6 py-4">City</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Software</th>
                        <th className="px-6 py-4">Primary Bucket</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300 text-xs">
                      {leads.map((l) => (
                        <tr 
                          key={l.id} 
                          className="hover:bg-white/[0.02] cursor-pointer transition-all border-b border-white/[0.03]"
                          onClick={() => setSelectedLead(l)}
                        >
                          <td className="px-6 py-3 font-bold text-white max-w-[180px] truncate">{l.businessName}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getGradeBadgeClass(l.score?.leadGrade || 'D')}`}>
                              {l.score?.leadGrade || 'D'}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-mono font-bold text-slate-100">
                            {l.score?.torqiFitScore || 0}
                          </td>
                          <td className="px-6 py-3">{l.city || '—'}</td>
                          <td className="px-6 py-3 font-mono text-slate-400">{l.phoneFormatted || l.phoneRaw || '—'}</td>
                          <td className="px-6 py-3">
                            {l.scan?.detectedSoftware ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                                {l.scan.detectedSoftware}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">None</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-slate-400 max-w-[180px] truncate">{l.score?.primaryBucket || '—'}</td>
                          <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => triggerLeadRescan(l.id)}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-[#FF002E] border border-white/5 text-[9px] font-bold text-slate-400 hover:text-white transition-all"
                            >
                              Rescan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Charts & Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Grade distributions */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Outreach Grades</h3>
              <div className="space-y-3">
                {Object.entries(grades).map(([grd, count]) => {
                  const percent = Math.round((count / Math.max(1, leads.length)) * 100);
                  return (
                    <div key={grd} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-300">Grade {grd}</span>
                        <span className="text-slate-400">{count} shops ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-950 border border-white/5 overflow-hidden">
                        <style>{`
                          #grade-bar-${grd} {
                            width: ${percent}%;
                          }
                        `}</style>
                        <div 
                          id={`grade-bar-${grd}`}
                          className={`h-full rounded-full ${
                            grd === 'A' ? 'bg-[#FF002E]' : 
                            grd === 'B' ? 'bg-orange-500' : 
                            grd === 'C' ? 'bg-yellow-500' : 'bg-slate-700'
                          }`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Core Operational Gaps distribution */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Operational Gaps distribution</h3>
              <div className="space-y-3">
                {Object.entries(buckets).map(([bName, count]) => {
                  const percent = Math.round((count / Math.max(1, leads.length)) * 100);
                  return (
                    <div key={bName} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300 truncate max-w-[200px]">{bName}</span>
                        <span className="text-slate-400">{count} shops ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-950 border border-white/5 overflow-hidden">
                        <style>{`
                          #gap-bar-${bName.replace(/[^a-zA-Z0-9]/g, '')} {
                            width: ${percent}%;
                          }
                        `}</style>
                        <div 
                          id={`gap-bar-${bName.replace(/[^a-zA-Z0-9]/g, '')}`}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(buckets).length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No scored leads available for distribution graphs.
                  </div>
                )}
              </div>
            </div>

            {/* Software Detections distribution */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 md:col-span-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Detected Shop Software</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(software).map(([soft, count]) => (
                  <div key={soft} className="p-4 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">{soft}</span>
                      <span className="text-[10px] text-slate-500 block">Matched {count} shops</span>
                    </div>
                    <span className="text-lg font-bold text-white font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded">
                      {Math.round((count / Math.max(1, leads.length)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Execution Logs */}
        {activeTab === 'logs' && (
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col font-mono text-[11px] min-h-[400px]">
            <div className="px-6 py-3 border-b border-white/5 bg-slate-950 text-slate-500">
              CAMPAIGN DISCOVERY LOG OUTPUT
            </div>
            <div className="p-6 bg-[#04060b] overflow-y-auto space-y-2 flex-1 max-h-[500px]">
              {logs.map(log => (
                <div key={log.id} className="flex gap-4 border-b border-white/[0.01] pb-1">
                  <span className="text-slate-600">[{mounted ? new Date(log.createdAt).toLocaleTimeString() : ''}]</span>
                  <span className={`uppercase ${log.level === 'error' ? 'text-red-400 font-bold' : log.level === 'warn' ? 'text-amber-400' : 'text-cyan-400'}`}>
                    [{log.level}]
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                  No execution logs recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Export Center */}
        {activeTab === 'export' && (
          <div className="glass-panel rounded-2xl p-6 border border-white/5 max-w-xl mx-auto w-full space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Generate Leads Database Export</h3>
              <p className="text-slate-400 text-xs mt-1">Select your CRM target schema layout to download the lead dataset as CSV.</p>
            </div>

            <div className="space-y-4">
              {[
                { id: 'sales', label: 'Sales Outreach Layout', desc: 'Precompiled cold pitch points, opening lines, and gaps.' },
                { id: 'crm', label: 'CRM Import Layout', desc: 'Clean headers for mapping directly to HubSpot, Zoho, or Salesforce.' },
                { id: 'full', label: 'Full Intelligence Record', desc: 'All parsed Google fields, Cheerio crawled signals, and scoring.' },
                { id: 'software-fit', label: 'Software-Fit Directory', desc: 'Filter for targets with shop software (Tekmetric, Shopmonkey, etc.).' },
                { id: 'after-hours', label: 'After-Hours Early Close', desc: 'Filter for targets with weekday closing gaps or closed weekends.' },
              ].map(opt => (
                <label 
                  key={opt.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer select-none transition-all ${
                    selectedExportFormat === opt.id 
                      ? 'bg-[#FF002E]/5 border-[#FF002E] text-white' 
                      : 'bg-white/[0.01] border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <input 
                    type="radio"
                    name="export-format"
                    checked={selectedExportFormat === opt.id}
                    onChange={() => setSelectedExportFormat(opt.id)}
                    className="mt-1 accent-[#FF002E]"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-200">{opt.label}</span>
                    <span className="block text-[10px] text-slate-500 mt-1">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {exportMessage && (
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-[#FF002E] font-semibold text-center font-mono">
                {exportMessage}
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3.5 rounded-xl bg-[#FF002E] hover:bg-[#E60029] text-white font-bold text-xs tracking-wide border-glow transition-all"
            >
              {exporting ? 'Compiling Lead Schema...' : 'Generate & Download CSV File'}
            </button>
          </div>
        )}
      </div>

      {/* Slide-out Drawer Panel for Lead Detail */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="absolute inset-0" onClick={() => setSelectedLead(null)}></div>
          
          <div className="relative w-full max-w-2xl h-full bg-[#0a0f1d] border-l border-white/10 shadow-2xl p-8 overflow-y-auto flex flex-col justify-between z-10 animate-slide-in">
            <div className="space-y-6">
              {/* Drawer header */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getGradeBadgeClass(selectedLead.score?.leadGrade || 'D')} mb-2`}>
                    Grade {selectedLead.score?.leadGrade || 'D'}
                  </span>
                  <h3 className="text-lg font-bold text-white">{selectedLead.businessName}</h3>
                  <p className="text-slate-400 text-xs mt-1">{selectedLead.address}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold font-mono"
                >
                  ESC
                </button>
              </div>

              {/* Score summary panel */}
              {selectedLead.score && (
                <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Fit Score</span>
                    <span className="text-2xl font-extrabold text-[#FF002E] mt-1 block">{selectedLead.score.torqiFitScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Priority</span>
                    <span className="text-sm font-extrabold text-white mt-2 block">{selectedLead.score.outreachPriority}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Confidence</span>
                    <span className="text-2xl font-extrabold text-cyan-400 mt-1 block">{selectedLead.score.dataConfidenceScore}%</span>
                  </div>
                </div>
              )}

              {/* Operating hours blocks */}
              <div className="glass-panel rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Business Operating Hours</h4>
                <div className="text-xs text-slate-300">
                  <span className="block text-slate-400 mb-2">Hours Summary: <strong>{selectedLead.hoursSummary || 'Not Available'}</strong></span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                    <div className={`p-1.5 rounded ${selectedLead.closesBefore6 ? 'bg-[#FF002E]/5 text-[#FF002E]' : 'bg-slate-900/50'}`}>
                      Closes &lt; 6PM: {selectedLead.closesBefore6 ? 'YES' : 'NO'}
                    </div>
                    <div className={`p-1.5 rounded ${selectedLead.closedSaturday ? 'bg-[#FF002E]/5 text-[#FF002E]' : 'bg-slate-900/50'}`}>
                      Closed Saturday: {selectedLead.closedSaturday ? 'YES' : 'NO'}
                    </div>
                    <div className={`p-1.5 rounded ${selectedLead.closedSunday ? 'bg-[#FF002E]/5 text-[#FF002E]' : 'bg-slate-900/50'}`}>
                      Closed Sunday: {selectedLead.closedSunday ? 'YES' : 'NO'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Website scan signals */}
              <div className="glass-panel rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Website Crawler Findings</h4>
                  {selectedLead.website && (
                    <button
                      onClick={() => triggerLeadRescan(selectedLead.id)}
                      className="text-[10px] font-bold text-[#FF002E] hover:underline"
                    >
                      Rescan Domain
                    </button>
                  )}
                </div>

                {selectedLead.scan ? (
                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 block">HTTP Status</span>
                        <span className="font-mono text-slate-200">{selectedLead.scan.httpStatus || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Pages Scanned</span>
                        <span className="font-mono text-slate-200">{selectedLead.scan.pagesScanned}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Booking Strength</span>
                        <span className="text-slate-200 font-semibold">{selectedLead.scan.bookingFlowStrength}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Texting Widget</span>
                        <span className="text-slate-200 font-semibold">{selectedLead.scan.textCapability}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <span className="text-slate-500 block">Detected Software</span>
                      {selectedLead.scan.detectedSoftware ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold mt-1">
                          {selectedLead.scan.detectedSoftware} (Confidence: {selectedLead.scan.softwareConfidence})
                        </span>
                      ) : (
                        <span className="text-slate-400 mt-1 block">No shop management scripts matched.</span>
                      )}
                    </div>

                    {selectedLead.scan.softwareEvidence && (
                      <div className="p-3 bg-slate-950 rounded border border-white/5 font-mono text-[10px] text-slate-400">
                        <span className="block text-slate-500 font-bold uppercase mb-1">Evidence Code Pattern:</span>
                        {selectedLead.scan.softwareEvidence}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs py-2">
                    No web scan profile exists. Website: {selectedLead.website ? (
                      <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-[#FF002E] underline">
                        {selectedLead.website}
                      </a>
                    ) : 'None'}
                  </div>
                )}
              </div>

              {/* Cold outreach script sales hook */}
              {selectedLead.score && (
                <div className="glass-panel rounded-xl p-5 space-y-4 border-l-2 border-l-[#FF002E]">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Outreach Cold-Call pitch</h4>
                  
                  <div className="space-y-3 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 font-bold uppercase block text-[10px] mb-1">Opening Line Hook:</span>
                      <p className="bg-[#FF002E]/5 p-3.5 rounded-lg border border-[#FF002E]/20 text-slate-200 leading-relaxed font-medium">
                        "{selectedLead.score.openingLine || 'None generated.'}"
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 font-bold uppercase block text-[10px] mb-1">Pain Point Bucket Pitch:</span>
                      <p className="p-3 bg-white/[0.01] rounded border border-white/5 text-slate-300 leading-relaxed">
                        {selectedLead.score.salesHook || 'No hook computed.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 font-bold uppercase block text-[10px] mb-1">Secondary Buckets Match:</span>
                      <span className="text-slate-400 block">{selectedLead.score.secondaryBuckets || 'None'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-white/5 pt-6 mt-8 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono text-[10px]">LEAD ID: {selectedLead.id}</span>
              <div className="flex gap-2">
                {selectedLead.googleMapsUrl && (
                  <a 
                    href={selectedLead.googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-bold transition-all"
                  >
                    Open Google Maps
                  </a>
                )}
                {selectedLead.website && (
                  <a 
                    href={selectedLead.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-[#FF002E] hover:bg-[#E60029] text-white font-bold transition-all"
                  >
                    Open Website URL
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
