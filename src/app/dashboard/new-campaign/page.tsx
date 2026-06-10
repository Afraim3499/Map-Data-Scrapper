'use strict';
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
];

const CATEGORIES = [
  'Auto Repair',
  'Dealership',
  'Body Shop',
  'Detailing Shop',
  'Tire & Wheel Shop',
  'Transmission Repair',
  'Oil Change Shop',
  'Muffler & Exhaust'
];

export default function NewCampaignPage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [state, setState] = useState('Georgia');
  const [businessCategory, setBusinessCategory] = useState('Auto Repair');
  const [searchQueries, setSearchQueries] = useState('auto repair shop, mechanic, car repair');
  const [runImmediately, setRunImmediately] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !searchQueries.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create the campaign
      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          state,
          businessCategory,
          searchQueries,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.error || 'Failed to create campaign');
      }

      const campaign = await createRes.json();

      // 2. Start it if toggled
      if (runImmediately) {
        const startRes = await fetch(`/api/campaigns/${campaign.id}/start`, {
          method: 'POST',
        });
        if (!startRes.ok) {
          console.error('Failed to trigger scan automatically.');
        }
      }

      // 3. Redirect
      router.push(`/dashboard/campaigns/${campaign.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the campaign.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <Link 
        href="/dashboard" 
        className="text-xs text-slate-400 hover:text-white transition-colors mb-6 inline-block"
      >
        ← Back to Campaigns
      </Link>

      {/* Form Container */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
          <h2 className="text-lg font-bold text-white">Create Territory Campaign</h2>
          <p className="text-slate-400 text-xs mt-1">Configure your search grid and query keywords to scrape auto-businesses.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label htmlFor="campaign-name" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Campaign Name <span className="text-[#FF002E]">*</span>
            </label>
            <input 
              id="campaign-name"
              type="text" 
              placeholder="e.g., Atlanta Independent Mechanics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 focus:border-[#FF002E] text-white text-sm outline-none transition-all"
            />
            <span className="text-[10px] text-slate-500">Provide a descriptive name for your sales target group.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* US State */}
            <div className="flex flex-col gap-2">
              <label htmlFor="campaign-state" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Target US State
              </label>
              <select 
                id="campaign-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-sm outline-none focus:border-[#FF002E] transition-all"
              >
                {STATES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500">Grids are divided by the state's major ZIP codes.</span>
            </div>

            {/* Business Category */}
            <div className="flex flex-col gap-2">
              <label htmlFor="campaign-category" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Business Category
              </label>
              <select 
                id="campaign-category"
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-sm outline-none focus:border-[#FF002E] transition-all"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500">For CRM grouping and sales outreach logs.</span>
            </div>
          </div>

          {/* Search Queries */}
          <div className="flex flex-col gap-2">
            <label htmlFor="campaign-queries" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Google Maps Search Queries <span className="text-[#FF002E]">*</span>
            </label>
            <input 
              id="campaign-queries"
              type="text" 
              placeholder="e.g., auto repair shop, mechanic, car repair"
              value={searchQueries}
              onChange={(e) => setSearchQueries(e.target.value)}
              required
              className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 focus:border-[#FF002E] text-white text-sm outline-none transition-all"
            />
            <span className="text-[10px] text-slate-500">Comma-separated query words sent to the Google Places search endpoint.</span>
          </div>

          {/* Start Toggle */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <input 
              id="run-immediately"
              type="checkbox"
              checked={runImmediately}
              onChange={(e) => setRunImmediately(e.target.checked)}
              className="w-4.5 h-4.5 accent-[#FF002E] cursor-pointer rounded"
            />
            <div className="flex flex-col">
              <label htmlFor="run-immediately" className="text-xs font-bold text-white cursor-pointer select-none">
                Start scan immediately
              </label>
              <span className="text-[10px] text-slate-400">Launch Places discovery and website scraper on save.</span>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold transition-all"
            >
              Cancel
            </Link>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-[#FF002E] hover:bg-[#E60029] text-white text-xs font-bold tracking-wide border-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : (runImmediately ? 'Save & Start Scan' : 'Save as Draft')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
