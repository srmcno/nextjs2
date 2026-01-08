'use client';

import { useEffect, useState, useCallback } from 'react';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface WaterLevelData {
  value: number;
  dateTime: string;
  status: 'normal' | 'elevated' | 'low';
  trend: 'rising' | 'falling' | 'stable';
  change24h: number;
}

interface USGSWaterDataProps {
  siteId: string;
  siteName: string;
  normalPoolElevation: number;
}

// USGS Site ID for Sardis Lake, OK: 07335700 (Sardis Lake near Clayton, OK)
// This is a simulated response structure since CORS may prevent direct API calls
// In production, you would use a backend proxy or USGS API

export default function USGSWaterData({ siteId, normalPoolElevation }: USGSWaterDataProps) {
  const [waterData, setWaterData] = useState<WaterLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWaterData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use our API route to proxy USGS requests (avoids CORS issues)
      const response = await fetch(`/api/usgs?site=${siteId}&period=P1D&parameterCd=00065,62614`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // Check for API error response
      if (data.error) {
        throw new Error(data.message || 'USGS data unavailable');
      }

      // Parse USGS response
      if (data.value?.timeSeries?.[0]?.values?.[0]?.value) {
        const values = data.value.timeSeries[0].values[0].value;
        const latestValue = values[values.length - 1];
        const previousValue = values.length > 1 ? values[0] : latestValue;

        const currentLevel = parseFloat(latestValue.value);
        const previousLevel = parseFloat(previousValue.value);
        const change = currentLevel - previousLevel;

        setWaterData({
          value: currentLevel,
          dateTime: latestValue.dateTime,
          status: currentLevel > normalPoolElevation + 5 ? 'elevated' :
                  currentLevel < normalPoolElevation - 10 ? 'low' : 'normal',
          trend: change > 0.1 ? 'rising' : change < -0.1 ? 'falling' : 'stable',
          change24h: change,
        });
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      throw new Error('No data available from USGS');

    } catch (err) {
      console.error('Failed to fetch USGS data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load water data');

      // Don't use fake data - show the error state
      setWaterData(null);
    } finally {
      setLoading(false);
    }
  }, [siteId, normalPoolElevation]);

  useEffect(() => {
    fetchWaterData();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchWaterData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWaterData]);

  if (loading && !waterData) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading water data...</span>
        </div>
      </div>
    );
  }

  if (error && !waterData) {
    return (
      <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
        <button 
          onClick={fetchWaterData}
          className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!waterData) return null;

  const TrendIcon = waterData.trend === 'rising' ? TrendingUp : 
                    waterData.trend === 'falling' ? TrendingDown : Minus;

  const trendColor = waterData.trend === 'rising' ? 'text-emerald-400' :
                     waterData.trend === 'falling' ? 'text-orange-400' : 'text-slate-400';

  const statusColor = waterData.status === 'elevated' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                      waterData.status === 'low' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                      'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';

  const percentCapacity = ((waterData.value - 530) / (normalPoolElevation - 530) * 100).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-emerald-400 font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" /> Real-Time Water Level
          </h4>
          <button 
            onClick={fetchWaterData}
            className="text-slate-400 hover:text-emerald-400 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-slate-400 text-xs mb-1">Current Elevation</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">
              {waterData.value.toFixed(2)} <span className="text-sm font-normal">ft</span>
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">% of Normal Pool</div>
            <div className="text-2xl font-bold text-slate-200 font-mono">
              {percentCapacity}%
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            <span className={`text-sm ${trendColor}`}>
              {waterData.trend.charAt(0).toUpperCase() + waterData.trend.slice(1)}
            </span>
            <span className="text-slate-500 text-xs">
              ({waterData.change24h >= 0 ? '+' : ''}{waterData.change24h.toFixed(2)} ft/24h)
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColor}`}>
            {waterData.status.charAt(0).toUpperCase() + waterData.status.slice(1)}
          </span>
        </div>

        {/* Visual level indicator */}
        <div className="mt-4">
          <div className="h-8 bg-slate-900 rounded-lg overflow-hidden relative">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500"
              style={{ height: `${Math.min(100, Math.max(0, parseFloat(percentCapacity)))}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white drop-shadow-lg">
                {waterData.value.toFixed(1)} ft
              </span>
            </div>
            {/* Normal pool line */}
            <div 
              className="absolute left-0 right-0 border-t-2 border-dashed border-emerald-400"
              style={{ bottom: '100%', transform: 'translateY(100%)' }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>530 ft (bed)</span>
            <span>{normalPoolElevation} ft (normal)</span>
          </div>
        </div>
      </div>

      {/* Data source attribution */}
      <div className="text-xs text-slate-500 flex items-center justify-between">
        <span>Data: USGS Site {siteId}</span>
        {lastUpdated && (
          <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>

      {/* Alerts for elevated or low conditions */}
      {waterData.status === 'elevated' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Elevated Water Level
          </div>
          <p className="text-yellow-300/80 text-xs mt-1">
            Water level is {(waterData.value - normalPoolElevation).toFixed(2)} ft above normal pool elevation.
            Some recreational areas may be affected.
          </p>
        </div>
      )}

      {waterData.status === 'low' && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Below Normal Pool
          </div>
          <p className="text-orange-300/80 text-xs mt-1">
            Water level is {(normalPoolElevation - waterData.value).toFixed(2)} ft below normal pool elevation.
            Boat ramp access may be limited.
          </p>
        </div>
      )}
    </div>
  );
}
