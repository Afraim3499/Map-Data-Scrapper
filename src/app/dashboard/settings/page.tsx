'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [maxZipsPerCampaign, setMaxZipsPerCampaign] = useState(10);
  const [zipCodeOffset, setZipCodeOffset] = useState(0);
  const [maxQueriesPerZip, setMaxQueriesPerZip] = useState(5);
  const [maxWebsitesScannedPerMinute, setMaxWebsitesScannedPerMinute] = useState(10);
  const [websiteTimeoutSeconds, setWebsiteTimeoutSeconds] = useState(15);
  const [enableJsScanDefault, setEnableJsScanDefault] = useState(false);
  const [defaultExportFormat, setDefaultExportFormat] = useState('sales');
  const [excludedDomains, setExcludedDomains] = useState('');
  const [excludedBusinessNames, setExcludedBusinessNames] = useState('');
  const [excludedBusinessStatuses, setExcludedBusinessStatuses] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Fetch settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();
        
        setGoogleMapsApiKey(data.googleMapsApiKey || '');
        setMaxZipsPerCampaign(data.maxZipsPerCampaign || 10);
        setZipCodeOffset(data.zipCodeOffset || 0);
        setMaxQueriesPerZip(data.maxQueriesPerZip || 5);
        setMaxWebsitesScannedPerMinute(data.maxWebsitesScannedPerMinute || 10);
        setWebsiteTimeoutSeconds(data.websiteTimeoutSeconds || 15);
        setEnableJsScanDefault(data.enableJsScanDefault || false);
        setDefaultExportFormat(data.defaultExportFormat || 'sales');
        setExcludedDomains(data.excludedDomains || '');
        setExcludedBusinessNames(data.excludedBusinessNames || '');
        setExcludedBusinessStatuses(data.excludedBusinessStatuses || '');
      } catch (err: any) {
        setMessage({ text: 'Error loading settings: ' + err.message, type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleMapsApiKey,
          maxZipsPerCampaign,
          zipCodeOffset,
          maxQueriesPerZip,
          maxWebsitesScannedPerMinute,
          websiteTimeoutSeconds,
          enableJsScanDefault,
          defaultExportFormat,
          excludedDomains,
          excludedBusinessNames,
          excludedBusinessStatuses,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update settings');
      }

      setMessage({ text: 'Settings saved successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Error saving settings: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-[#FF5C00] animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-xs font-mono">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">System Settings</h2>
        <p className="text-slate-400 text-xs mt-1">Configure API keys, discovery grids, web crawler behaviors, and data filter rules.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {message.text && (
          <div className={`p-4 rounded-xl text-xs font-semibold border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* 1. API Keys */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
            <h3 className="text-sm font-bold text-white">External Connections</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="google-api-key" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Google Places API Key
              </label>
              <div className="relative flex items-center">
                <input 
                  id="google-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={googleMapsApiKey}
                  onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                  className="w-full pl-4 pr-16 py-3 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 focus:border-[#FF5C00] text-white text-xs outline-none focus:ring-0 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded transition-all"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Requires the Places API (New) enabled. Leave blank to run searches in <strong>Simulation Fallback Mode</strong> using mock listings.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Grid & Crawl Limits */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
            <h3 className="text-sm font-bold text-white">Scan Limit Overrides</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="max-zips" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Max ZIP Codes per State Scan
              </label>
              <input 
                id="max-zips"
                type="number" 
                value={maxZipsPerCampaign}
                onChange={(e) => setMaxZipsPerCampaign(Number(e.target.value))}
                min={1}
                max={5000}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-[#FF5C00] transition-all font-mono"
              />
              <span className="text-[10px] text-slate-500">Limits grid searches (Default: 10, Max: 5000).</span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="zip-offset" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                ZIP Code Offset (Start Skip)
              </label>
              <input 
                id="zip-offset"
                type="number" 
                value={zipCodeOffset}
                onChange={(e) => setZipCodeOffset(Number(e.target.value))}
                min={0}
                max={5000}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-[#FF5C00] transition-all font-mono"
              />
              <span className="text-[10px] text-slate-500">Skip the first N zip codes of the state (Default: 0).</span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="max-queries" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Max Search Queries per ZIP
              </label>
              <input 
                id="max-queries"
                type="number" 
                value={maxQueriesPerZip}
                onChange={(e) => setMaxQueriesPerZip(Number(e.target.value))}
                min={1}
                max={10}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-[#FF5C00] transition-all font-mono"
              />
              <span className="text-[10px] text-slate-500">Max query keywords processed per cell (Default: 5).</span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="scan-rate" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Max Website Crawls per Minute
              </label>
              <input 
                id="scan-rate"
                type="number" 
                value={maxWebsitesScannedPerMinute}
                onChange={(e) => setMaxWebsitesScannedPerMinute(Number(e.target.value))}
                min={1}
                max={120}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-[#FF5C00] transition-all font-mono"
              />
              <span className="text-[10px] text-slate-500">Rate limiter for crawler tasks.</span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="crawl-timeout" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Crawler Timeout (Seconds)
              </label>
              <input 
                id="crawl-timeout"
                type="number" 
                value={websiteTimeoutSeconds}
                onChange={(e) => setWebsiteTimeoutSeconds(Number(e.target.value))}
                min={2}
                max={60}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-[#FF5C00] transition-all font-mono"
              />
              <span className="text-[10px] text-slate-500">Aborts crawl of slow sites after limit (Default: 15s).</span>
            </div>
          </div>
        </div>

        {/* 3. Blocklists */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
            <h3 className="text-sm font-bold text-white">Exclusion Blocklists</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="excluded-domains" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Excluded Domains
              </label>
              <textarea 
                id="excluded-domains"
                rows={2}
                placeholder="facebook.com, yelp.com, youtube.com"
                value={excludedDomains}
                onChange={(e) => setExcludedDomains(e.target.value)}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-[#FF5C00] transition-all"
              />
              <span className="text-[10px] text-slate-500">Comma-separated hostnames to skip crawling or recording.</span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="excluded-names" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Excluded Business Names
              </label>
              <textarea 
                id="excluded-names"
                rows={2}
                placeholder="AutoZone, O'Reilly, NAPA Auto Parts"
                value={excludedBusinessNames}
                onChange={(e) => setExcludedBusinessNames(e.target.value)}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-[#FF5C00] transition-all"
              />
              <span className="text-[10px] text-slate-500">Comma-separated business keywords to skip from results.</span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="excluded-status" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Excluded Google Statuses
              </label>
              <input 
                id="excluded-status"
                type="text"
                placeholder="CLOSED_PERMANENTLY"
                value={excludedBusinessStatuses}
                onChange={(e) => setExcludedBusinessStatuses(e.target.value)}
                className="px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-[#FF5C00] transition-all"
              />
              <span className="text-[10px] text-slate-500">Skip listings matching these status labels.</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold text-sm tracking-wide border-glow transition-all disabled:opacity-50"
          >
            {saving ? 'Saving System Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
