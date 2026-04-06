/**
 * Stats.tsx
 * Description: Realtime resources metrics graphics
 * Part of CorvusX: Intelligence in the Shadows
 * Generated on: 2026-05-31T17:59:22.524Z
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { shadowTheme } from '../theme';

export interface StatsProps {
  title?: string;
  refreshInterval?: number;
  onAction?: (actionId: string, data: any) => void;
  style?: React.CSSProperties;
  className?: string;
}

export const Stats: React.FC<StatsProps> = ({
  title = 'Stats',
  refreshInterval = 2000,
  onAction,
  style,
  className = ''
}) => {
  const [dataList, setDataList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await new Promise<any[]>((resolve) => {
        setTimeout(() => {
          resolve([
            { id: '1', name: 'Agent Alpha', status: 'stealth', ping: '12ms' },
            { id: '2', name: 'Agent Beta', status: 'idle', ping: '45ms' },
            { id: '3', name: 'Agent Gamma', status: 'error', ping: '0ms' },
          ]);
        }, 50);
      });
      setDataList(response);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      fetchData();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [fetchData, refreshInterval]);

  const filteredData = useMemo(() => {
    return dataList.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dataList, searchTerm]);

  const handleItemClick = (id: string) => {
    if (onAction) {
      onAction('item_click', { id });
    }
  };

  return (
    <div
      className={`corvus-container ${className}`}
      style={{
        backgroundColor: shadowTheme.bg,
        color: shadowTheme.fg,
        padding: '1.5rem',
        borderRadius: '8px',
        border: `1px solid ${shadowTheme.accent}`,
        fontFamily: 'monospace',
        ...style
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, borderBottom: `2px solid ${shadowTheme.accent}`, paddingBottom: '0.2rem' }}>
          {title}
        </h3>
        <div>
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            style={{ background: '#222', border: '1px solid #444', color: '#0f0', marginRight: '0.5rem' }}
          >
            View: {viewMode}
          </button>
          <button 
            onClick={fetchData} 
            disabled={isLoading}
            style={{ background: '#222', border: '1px solid #444', color: '#0f0' }}
          >
            {isLoading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Filter logs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          background: '#050505',
          border: '1px solid #333',
          color: '#0f0',
          padding: '0.5rem',
          marginBottom: '1rem',
          borderRadius: '4px'
        }}
      />

      {error && <div style={{ color: shadowTheme.accent, marginBottom: '1rem' }}>Error: {error}</div>}

      {isLoading ? (
        <div>Loading encrypted streams...</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredData.map(item => (
            <li 
              key={item.id} 
              onClick={() => handleItemClick(item.id)}
              style={{
                padding: '0.5rem',
                borderBottom: '1px solid #111',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                background: item.status === 'error' ? '#200' : 'transparent'
              }}
            >
              <span>{item.name}</span>
              <span>[{item.status}] - {item.ping}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
