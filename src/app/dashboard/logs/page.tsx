'use strict';
'use client';

import React, { useState, useEffect } from 'react';

interface Log {
  id: string;
  campaignId: string;
  level: string;
  message: string;
  createdAt: string;
  campaign?: {
    name: string;
  };
}

export default function LogsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for logs
  useEffect(() => {
    fetchLogs();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getLogLevelClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-400 font-bold';
      case 'warn':
        return 'text-amber-400 font-bold';
      case 'info':
        return 'text-cyan-400';
      default:
        return 'text-slate-400';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level.toLowerCase() === filterLevel;
    const matchesSearch = 
      log.message.toLowerCase().includes(search.toLowerCase()) || 
      (log.campaign?.name || '').toLowerCase().includes(search.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Platform Scan Logs</h2>
          <p className="text-slate-400 text-xs mt-1">Real-time status updates and execution streams across all grid campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto Refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${
              autoRefresh 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-slate-900 border-white/10 text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-400 animate-ping' : 'bg-slate-500'}`}></span>
            {autoRefresh ? 'Live Autorefresh Active' : 'Autorefresh Paused'}
          </button>
          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all"
          >
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input 
          type="text" 
          placeholder="Filter by keyword or campaign..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/5 focus:border-[#FF5C00] text-white text-xs outline-none transition-all"
        />

        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-slate-400 font-bold">Severity:</span>
          {['all', 'info', 'warn', 'error'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1.5 rounded-lg border font-bold capitalize transition-all ${
                filterLevel === lvl 
                  ? 'bg-[#FF5C00] border-[#FF5C00] text-white' 
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal logs view */}
      <div className="flex-1 min-h-[400px] glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col font-mono text-xs">
        <div className="px-6 py-3 border-b border-white/5 bg-slate-950 flex items-center justify-between text-slate-500">
          <span>TORQI WORKER OUTPUT TERMINAL</span>
          <span>COUNT: {filteredLogs.length}</span>
        </div>

        <div className="flex-1 p-6 bg-[#04060b] overflow-y-auto space-y-2 max-h-[60vh]">
          {loading ? (
            <div className="text-center py-20 text-slate-500">
              Initializing connection to terminal stream...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No logs matched the selected filters.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 border-b border-white/[0.02] pb-1.5">
                <span className="text-slate-600 shrink-0 select-none">
                  [{mounted ? new Date(log.createdAt).toLocaleTimeString() : ''}]
                </span>
                
                {log.campaign && (
                  <span className="text-slate-400 shrink-0 font-semibold max-w-[150px] truncate select-none">
                    {log.campaign.name}
                  </span>
                )}
                
                <span className={`shrink-0 uppercase select-none ${getLogLevelClass(log.level)}`}>
                  [{log.level}]
                </span>

                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
