'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Fish, Thermometer, Gauge, Moon, Sun,
  TrendingUp, TrendingDown, Minus, Wind, RefreshCw, Target
} from 'lucide-react';

interface FishingConditions {
  overallScore: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: {
    name: string;
    score: number;
    status: 'positive' | 'neutral' | 'negative';
    detail: string;
  }[];
  bestTime: string;
  targetSpecies: {
    name: string;
    activity: 'High' | 'Moderate' | 'Low';
  }[];
  tips: string[];
}

interface FishActivityIndexProps {
  lat: number;
  lng: number;
  waterTemp?: number;
}

// Moon phase calculation
function getMoonPhase(date: Date): { phase: string; illumination: number; icon: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Calculate days since known new moon (Jan 6, 2000)
  const lp = 2551443; // Lunar period in seconds
  const newMoon = new Date(2000, 0, 6, 18, 14, 0);
  const diff = date.getTime() - newMoon.getTime();
  const days = diff / 1000 / 60 / 60 / 24;
  const lunations = days / 29.53058867;
  const lunarDay = (lunations % 1) * 29.53058867;

  let phase: string;
  let icon: string;
  let illumination: number;

  if (lunarDay < 1.85) {
    phase = 'New Moon';
    icon = '🌑';
    illumination = 0;
  } else if (lunarDay < 5.53) {
    phase = 'Waxing Crescent';
    icon = '🌒';
    illumination = 25;
  } else if (lunarDay < 9.22) {
    phase = 'First Quarter';
    icon = '🌓';
    illumination = 50;
  } else if (lunarDay < 12.91) {
    phase = 'Waxing Gibbous';
    icon = '🌔';
    illumination = 75;
  } else if (lunarDay < 16.61) {
    phase = 'Full Moon';
    icon = '🌕';
    illumination = 100;
  } else if (lunarDay < 20.30) {
    phase = 'Waning Gibbous';
    icon = '🌖';
    illumination = 75;
  } else if (lunarDay < 23.99) {
    phase = 'Last Quarter';
    icon = '🌗';
    illumination = 50;
  } else if (lunarDay < 27.68) {
    phase = 'Waning Crescent';
    icon = '🌘';
    illumination = 25;
  } else {
    phase = 'New Moon';
    icon = '🌑';
    illumination = 0;
  }

  return { phase, illumination, icon };
}

// Solunar calculation (simplified major/minor periods)
function getSolunarPeriods(date: Date, lat: number): { major: string[]; minor: string[] } {
  const moonPhase = getMoonPhase(date);

  // Simplified solunar - major periods around moonrise/moonset, minor around moon overhead/underfoot
  // This is a simplified calculation for demonstration
  const hour = date.getHours();

  // Generate approximate periods based on moon phase
  const majorStart1 = (6 + Math.floor(moonPhase.illumination / 10)) % 24;
  const majorStart2 = (majorStart1 + 12) % 24;
  const minorStart1 = (majorStart1 + 6) % 24;
  const minorStart2 = (minorStart1 + 12) % 24;

  const formatPeriod = (start: number) => {
    const end = (start + 2) % 24;
    const startStr = start > 12 ? `${start - 12}pm` : start === 0 ? '12am' : `${start}am`;
    const endStr = end > 12 ? `${end - 12}pm` : end === 0 ? '12am' : `${end}am`;
    return `${startStr}-${endStr}`;
  };

  return {
    major: [formatPeriod(majorStart1), formatPeriod(majorStart2)],
    minor: [formatPeriod(minorStart1), formatPeriod(minorStart2)],
  };
}

export default function FishActivityIndex({ lat, lng, waterTemp = 68 }: FishActivityIndexProps) {
  const [conditions, setConditions] = useState<FishingConditions | null>(null);
  const [loading, setLoading] = useState(true);
  const [moonData, setMoonData] = useState<{ phase: string; illumination: number; icon: string } | null>(null);

  const calculateConditions = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch weather data for fishing calculations
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,pressure_msl,wind_speed_10m,cloud_cover,precipitation` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph` +
        `&timezone=America/Chicago`
      );

      const weather = await response.json();
      const current = weather.current;

      const moonPhase = getMoonPhase(new Date());
      setMoonData(moonPhase);

      const solunar = getSolunarPeriods(new Date(), lat);

      // Calculate individual factor scores (0-100)
      const factors: FishingConditions['factors'] = [];

      // Barometric Pressure Score
      const pressure = current.pressure_msl * 0.02953; // Convert to inHg
      let pressureScore = 0;
      let pressureStatus: 'positive' | 'neutral' | 'negative' = 'neutral';
      let pressureDetail = '';

      if (pressure >= 30.0 && pressure <= 30.2) {
        pressureScore = 90;
        pressureStatus = 'positive';
        pressureDetail = 'Stable high pressure - ideal';
      } else if (pressure >= 29.8 && pressure < 30.0) {
        pressureScore = 75;
        pressureStatus = 'positive';
        pressureDetail = 'Slightly falling - fish active';
      } else if (pressure > 30.2 && pressure <= 30.5) {
        pressureScore = 60;
        pressureStatus = 'neutral';
        pressureDetail = 'High pressure - slower fishing';
      } else if (pressure < 29.8) {
        pressureScore = 40;
        pressureStatus = 'negative';
        pressureDetail = 'Low pressure - fish deep';
      } else {
        pressureScore = 50;
        pressureStatus = 'neutral';
        pressureDetail = 'Very high - challenging';
      }

      factors.push({
        name: 'Barometric Pressure',
        score: pressureScore,
        status: pressureStatus,
        detail: `${pressure.toFixed(2)} inHg - ${pressureDetail}`,
      });

      // Water Temperature Score
      let tempScore = 0;
      let tempStatus: 'positive' | 'neutral' | 'negative' = 'neutral';
      let tempDetail = '';

      if (waterTemp >= 65 && waterTemp <= 75) {
        tempScore = 95;
        tempStatus = 'positive';
        tempDetail = 'Optimal range for bass';
      } else if (waterTemp >= 55 && waterTemp < 65) {
        tempScore = 70;
        tempStatus = 'neutral';
        tempDetail = 'Pre-spawn activity increasing';
      } else if (waterTemp > 75 && waterTemp <= 85) {
        tempScore = 65;
        tempStatus = 'neutral';
        tempDetail = 'Fish seeking cooler depths';
      } else if (waterTemp < 55) {
        tempScore = 40;
        tempStatus = 'negative';
        tempDetail = 'Cold - slow metabolism';
      } else {
        tempScore = 35;
        tempStatus = 'negative';
        tempDetail = 'Very warm - fish stressed';
      }

      factors.push({
        name: 'Water Temperature',
        score: tempScore,
        status: tempStatus,
        detail: `${waterTemp}°F - ${tempDetail}`,
      });

      // Wind Score
      const wind = current.wind_speed_10m;
      let windScore = 0;
      let windStatus: 'positive' | 'neutral' | 'negative' = 'neutral';
      let windDetail = '';

      if (wind >= 5 && wind <= 15) {
        windScore = 85;
        windStatus = 'positive';
        windDetail = 'Light chop - reduces visibility';
      } else if (wind < 5) {
        windScore = 60;
        windStatus = 'neutral';
        windDetail = 'Calm - fish more cautious';
      } else if (wind > 15 && wind <= 25) {
        windScore = 55;
        windStatus = 'neutral';
        windDetail = 'Moderate - concentrate on windward';
      } else {
        windScore = 30;
        windStatus = 'negative';
        windDetail = 'Too windy - difficult conditions';
      }

      factors.push({
        name: 'Wind',
        score: windScore,
        status: windStatus,
        detail: `${Math.round(wind)} mph - ${windDetail}`,
      });

      // Moon Phase Score
      let moonScore = 0;
      let moonStatus: 'positive' | 'neutral' | 'negative' = 'neutral';

      if (moonPhase.phase === 'New Moon' || moonPhase.phase === 'Full Moon') {
        moonScore = 90;
        moonStatus = 'positive';
      } else if (moonPhase.phase === 'First Quarter' || moonPhase.phase === 'Last Quarter') {
        moonScore = 70;
        moonStatus = 'neutral';
      } else {
        moonScore = 55;
        moonStatus = 'neutral';
      }

      factors.push({
        name: 'Moon Phase',
        score: moonScore,
        status: moonStatus,
        detail: `${moonPhase.icon} ${moonPhase.phase}`,
      });

      // Cloud Cover Score
      const clouds = current.cloud_cover;
      let cloudScore = 0;
      let cloudStatus: 'positive' | 'neutral' | 'negative' = 'neutral';

      if (clouds >= 40 && clouds <= 70) {
        cloudScore = 85;
        cloudStatus = 'positive';
      } else if (clouds > 70) {
        cloudScore = 70;
        cloudStatus = 'neutral';
      } else {
        cloudScore = 55;
        cloudStatus = 'neutral';
      }

      factors.push({
        name: 'Cloud Cover',
        score: cloudScore,
        status: cloudStatus,
        detail: `${clouds}% - ${clouds >= 40 && clouds <= 70 ? 'Ideal overcast' : clouds > 70 ? 'Heavy clouds' : 'Clear skies'}`,
      });

      // Calculate overall score
      const overallScore = Math.round(
        factors.reduce((sum, f) => sum + f.score, 0) / factors.length
      );

      // Determine rating
      let rating: FishingConditions['rating'];
      if (overallScore >= 80) rating = 'Excellent';
      else if (overallScore >= 65) rating = 'Good';
      else if (overallScore >= 50) rating = 'Fair';
      else rating = 'Poor';

      // Target species activity
      const targetSpecies: FishingConditions['targetSpecies'] = [
        {
          name: 'Largemouth Bass',
          activity: waterTemp >= 60 && waterTemp <= 80 && overallScore >= 60 ? 'High' :
                   waterTemp >= 50 && waterTemp <= 85 ? 'Moderate' : 'Low',
        },
        {
          name: 'Crappie',
          activity: waterTemp >= 55 && waterTemp <= 70 ? 'High' :
                   waterTemp >= 45 && waterTemp <= 75 ? 'Moderate' : 'Low',
        },
        {
          name: 'Catfish',
          activity: waterTemp >= 70 && clouds >= 50 ? 'High' :
                   waterTemp >= 60 ? 'Moderate' : 'Low',
        },
        {
          name: 'Bluegill',
          activity: waterTemp >= 65 && waterTemp <= 80 ? 'High' :
                   waterTemp >= 55 ? 'Moderate' : 'Low',
        },
      ];

      // Generate tips
      const tips: string[] = [];
      if (wind >= 5 && wind <= 15) {
        tips.push('Fish the windward shoreline where baitfish concentrate');
      }
      if (waterTemp >= 65 && waterTemp <= 75) {
        tips.push('Topwater lures effective in early morning');
      }
      if (pressure >= 29.8 && pressure <= 30.0) {
        tips.push('Falling pressure - fish feeding aggressively');
      }
      if (moonPhase.phase === 'Full Moon' || moonPhase.phase === 'New Moon') {
        tips.push('Major solunar period - extended feeding windows');
      }
      if (clouds >= 50) {
        tips.push('Overcast conditions favor shallow water fishing');
      }
      if (tips.length === 0) {
        tips.push('Fish structure and cover in deeper water');
      }

      setConditions({
        overallScore,
        rating,
        factors,
        bestTime: solunar.major[0],
        targetSpecies,
        tips,
      });
    } catch (err) {
      console.error('Error calculating fishing conditions:', err);
      // Set default conditions on error
      setConditions({
        overallScore: 60,
        rating: 'Fair',
        factors: [],
        bestTime: '6am-8am',
        targetSpecies: [
          { name: 'Largemouth Bass', activity: 'Moderate' },
          { name: 'Crappie', activity: 'Moderate' },
        ],
        tips: ['Check local conditions before heading out'],
      });
    } finally {
      setLoading(false);
    }
  }, [lat, lng, waterTemp]);

  useEffect(() => {
    calculateConditions();
    // Refresh every hour
    const interval = setInterval(calculateConditions, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [calculateConditions]);

  if (loading && !conditions) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Calculating fishing conditions...</span>
        </div>
      </div>
    );
  }

  if (!conditions) return null;

  const scoreColor = conditions.overallScore >= 80 ? 'text-emerald-400' :
                     conditions.overallScore >= 65 ? 'text-cyan-400' :
                     conditions.overallScore >= 50 ? 'text-yellow-400' : 'text-orange-400';

  const ratingBg = conditions.rating === 'Excellent' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                   conditions.rating === 'Good' ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' :
                   conditions.rating === 'Fair' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                   'bg-orange-500/20 border-orange-500/30 text-orange-400';

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-emerald-400 font-semibold flex items-center gap-2">
            <Fish className="w-4 h-4" /> Fishing Activity Index
          </h4>
          <button
            onClick={calculateConditions}
            className="text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Overall Score */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#1e293b"
                strokeWidth="8"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${conditions.overallScore * 2.26} 226`}
                className={scoreColor}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{conditions.overallScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${ratingBg}`}>
              {conditions.rating}
            </div>
            <div className="text-slate-400 text-sm mt-1">
              Best time: <span className="text-slate-200">{conditions.bestTime}</span>
            </div>
            {moonData && (
              <div className="text-slate-400 text-sm">
                {moonData.icon} {moonData.phase}
              </div>
            )}
          </div>
        </div>

        {/* Factors */}
        <div className="space-y-2 mb-4">
          {conditions.factors.map((factor, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-20 text-xs text-slate-400">{factor.name}</div>
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    factor.status === 'positive' ? 'bg-emerald-500' :
                    factor.status === 'negative' ? 'bg-orange-500' : 'bg-slate-500'
                  }`}
                  style={{ width: `${factor.score}%` }}
                />
              </div>
              <div className="w-8 text-xs text-slate-500 text-right">{factor.score}</div>
            </div>
          ))}
        </div>

        {/* Target Species */}
        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <Target className="w-3 h-3" /> Target Species Activity
          </div>
          <div className="grid grid-cols-2 gap-2">
            {conditions.targetSpecies.map((species, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                <span className="text-xs text-slate-300">{species.name}</span>
                <span className={`text-xs font-medium ${
                  species.activity === 'High' ? 'text-emerald-400' :
                  species.activity === 'Moderate' ? 'text-yellow-400' : 'text-slate-500'
                }`}>
                  {species.activity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="border-t border-slate-700 pt-3">
          <div className="text-xs text-slate-400 mb-2">Pro Tips</div>
          <ul className="space-y-1">
            {conditions.tips.slice(0, 3).map((tip, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
