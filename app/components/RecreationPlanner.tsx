'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sun, Moon, Sunrise, Sunset, Camera, Calendar,
  Clock, Cloud, ThermometerSun, Waves, RefreshCw
} from 'lucide-react';

interface AstronomicalData {
  sunrise: string;
  sunset: string;
  solarNoon: string;
  dayLength: number; // hours
  goldenHourMorning: { start: string; end: string };
  goldenHourEvening: { start: string; end: string };
  blueHourMorning: { start: string; end: string };
  blueHourEvening: { start: string; end: string };
  moonrise?: string;
  moonset?: string;
  moonPhase: string;
  moonIllumination: number;
}

interface DayForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  weatherCode: number;
  precipProbability: number;
  windSpeed: number;
  uvIndex: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

interface RecreationPlannerProps {
  lat: number;
  lng: number;
}

// Weather code to simple description
const getWeatherDescription = (code: number): string => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 99) return 'Thunderstorms';
  return 'Unknown';
};

// Rate a day for recreation
const rateDayForRecreation = (day: {
  tempHigh: number;
  precipProbability: number;
  windSpeed: number;
  weatherCode: number;
}): 'Excellent' | 'Good' | 'Fair' | 'Poor' => {
  let score = 100;

  // Temperature scoring (ideal: 70-85)
  if (day.tempHigh < 50 || day.tempHigh > 95) score -= 30;
  else if (day.tempHigh < 60 || day.tempHigh > 90) score -= 15;
  else if (day.tempHigh >= 70 && day.tempHigh <= 85) score += 10;

  // Precipitation scoring
  if (day.precipProbability > 70) score -= 40;
  else if (day.precipProbability > 40) score -= 20;
  else if (day.precipProbability > 20) score -= 10;

  // Wind scoring
  if (day.windSpeed > 25) score -= 25;
  else if (day.windSpeed > 15) score -= 10;

  // Weather code scoring
  if (day.weatherCode >= 95) score -= 30; // Thunderstorms
  else if (day.weatherCode >= 61) score -= 20; // Rain
  else if (day.weatherCode <= 3) score += 5; // Clear/Partly cloudy

  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
};

// Moon phase calculation
function getMoonData(date: Date): { phase: string; illumination: number; icon: string } {
  const newMoon = new Date(2000, 0, 6, 18, 14, 0);
  const diff = date.getTime() - newMoon.getTime();
  const lunarDay = ((diff / 1000 / 60 / 60 / 24) % 29.53058867 + 29.53058867) % 29.53058867;

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
    illumination = Math.round((lunarDay - 1.85) / 3.68 * 25);
  } else if (lunarDay < 9.22) {
    phase = 'First Quarter';
    icon = '🌓';
    illumination = 50;
  } else if (lunarDay < 12.91) {
    phase = 'Waxing Gibbous';
    icon = '🌔';
    illumination = 50 + Math.round((lunarDay - 9.22) / 3.69 * 25);
  } else if (lunarDay < 16.61) {
    phase = 'Full Moon';
    icon = '🌕';
    illumination = 100;
  } else if (lunarDay < 20.30) {
    phase = 'Waning Gibbous';
    icon = '🌖';
    illumination = 100 - Math.round((lunarDay - 16.61) / 3.69 * 25);
  } else if (lunarDay < 23.99) {
    phase = 'Last Quarter';
    icon = '🌗';
    illumination = 50;
  } else if (lunarDay < 27.68) {
    phase = 'Waning Crescent';
    icon = '🌘';
    illumination = 50 - Math.round((lunarDay - 23.99) / 3.69 * 25);
  } else {
    phase = 'New Moon';
    icon = '🌑';
    illumination = 0;
  }

  return { phase, illumination, icon };
}

export default function RecreationPlanner({ lat, lng }: RecreationPlannerProps) {
  const [astroData, setAstroData] = useState<AstronomicalData | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      // Use our API route to fetch weather
      const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}&forecast=7`);

      if (!response.ok) {
        throw new Error('Weather data unavailable');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || 'Weather data unavailable');
      }
      const today = new Date();
      const moonData = getMoonData(today);

      // Parse astronomical data for today
      const sunrise = new Date(data.daily.sunrise[0]);
      const sunset = new Date(data.daily.sunset[0]);
      const dayLengthMs = sunset.getTime() - sunrise.getTime();
      const dayLengthHours = dayLengthMs / 1000 / 60 / 60;

      // Calculate golden hour (approximately 1 hour after sunrise, 1 hour before sunset)
      const goldenMorningEnd = new Date(sunrise.getTime() + 60 * 60 * 1000);
      const goldenEveningStart = new Date(sunset.getTime() - 60 * 60 * 1000);

      // Calculate blue hour (approximately 20-40 min before sunrise, after sunset)
      const blueMorningStart = new Date(sunrise.getTime() - 40 * 60 * 1000);
      const blueMorningEnd = new Date(sunrise.getTime() - 20 * 60 * 1000);
      const blueEveningStart = new Date(sunset.getTime() + 20 * 60 * 1000);
      const blueEveningEnd = new Date(sunset.getTime() + 40 * 60 * 1000);

      // Solar noon (midpoint)
      const solarNoon = new Date(sunrise.getTime() + dayLengthMs / 2);

      const formatTime = (d: Date) => d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      setAstroData({
        sunrise: formatTime(sunrise),
        sunset: formatTime(sunset),
        solarNoon: formatTime(solarNoon),
        dayLength: dayLengthHours,
        goldenHourMorning: {
          start: formatTime(sunrise),
          end: formatTime(goldenMorningEnd),
        },
        goldenHourEvening: {
          start: formatTime(goldenEveningStart),
          end: formatTime(sunset),
        },
        blueHourMorning: {
          start: formatTime(blueMorningStart),
          end: formatTime(blueMorningEnd),
        },
        blueHourEvening: {
          start: formatTime(blueEveningStart),
          end: formatTime(blueEveningEnd),
        },
        moonPhase: moonData.phase,
        moonIllumination: moonData.illumination,
      });

      // Parse 7-day forecast
      const forecastData: DayForecast[] = data.daily.time.map((time: string, idx: number) => {
        const tempHigh = Math.round(data.daily.temperature_2m_max[idx]);
        const precipProbability = data.daily.precipitation_probability_max[idx];
        const windSpeed = Math.round(data.daily.wind_speed_10m_max[idx]);
        const weatherCode = data.daily.weather_code[idx];

        return {
          date: time,
          tempHigh,
          tempLow: Math.round(data.daily.temperature_2m_min[idx]),
          weatherCode,
          precipProbability,
          windSpeed,
          uvIndex: Math.round(data.daily.uv_index_max[idx]),
          rating: rateDayForRecreation({ tempHigh, precipProbability, windSpeed, weatherCode }),
        };
      });

      setForecast(forecastData);
    } catch (err) {
      console.error('Error fetching recreation data:', err);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !astroData) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading recreation data...</span>
        </div>
      </div>
    );
  }

  const ratingColors = {
    Excellent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Good: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    Fair: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Poor: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const moonData = getMoonData(new Date());

  return (
    <div className="space-y-3">
      {/* Today's Astronomical Data */}
      {astroData && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-emerald-400 font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Recreation Planner
            </h4>
            <button
              onClick={fetchData}
              className="text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Sun & Moon Times */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <Sun className="w-4 h-4" />
                <span className="text-sm font-medium">Sun</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Sunrise className="w-3 h-3" /> Rise
                  </span>
                  <span className="text-slate-200">{astroData.sunrise}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Sunset className="w-3 h-3" /> Set
                  </span>
                  <span className="text-slate-200">{astroData.sunset}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Day Length</span>
                  <span className="text-slate-200">
                    {Math.floor(astroData.dayLength)}h {Math.round((astroData.dayLength % 1) * 60)}m
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Moon className="w-4 h-4" />
                <span className="text-sm font-medium">Moon</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Phase</span>
                  <span className="text-slate-200">{moonData.icon} {moonData.phase}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Illumination</span>
                  <span className="text-slate-200">{moonData.illumination}%</span>
                </div>
                <div className="mt-1">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${moonData.illumination}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photography Hours */}
          <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Camera className="w-4 h-4" />
              <span className="text-sm font-medium">Best Photography Hours</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-400 mb-1">Golden Hour (AM)</div>
                <div className="text-amber-400">
                  {astroData.goldenHourMorning.start} - {astroData.goldenHourMorning.end}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">Golden Hour (PM)</div>
                <div className="text-amber-400">
                  {astroData.goldenHourEvening.start} - {astroData.goldenHourEvening.end}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">Blue Hour (AM)</div>
                <div className="text-blue-400">
                  {astroData.blueHourMorning.start} - {astroData.blueHourMorning.end}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">Blue Hour (PM)</div>
                <div className="text-blue-400">
                  {astroData.blueHourEvening.start} - {astroData.blueHourEvening.end}
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Recreation Forecast */}
          <div>
            <div className="text-xs text-slate-400 mb-2">7-Day Recreation Outlook</div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {forecast.map((day, idx) => {
                const date = new Date(day.date);
                const dayName = idx === 0 ? 'Today' :
                               idx === 1 ? 'Tomorrow' :
                               date.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(idx)}
                    className={`flex-shrink-0 p-2 rounded-lg text-center min-w-[60px] transition-all border ${
                      selectedDay === idx
                        ? 'bg-slate-700 border-emerald-500'
                        : 'bg-slate-900/50 border-transparent hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-xs text-slate-400">{dayName}</div>
                    <div className="text-lg font-bold text-slate-200">{day.tempHigh}°</div>
                    <div className="text-xs text-slate-500">{day.tempLow}°</div>
                    <div className={`text-xs mt-1 px-1 py-0.5 rounded ${ratingColors[day.rating]}`}>
                      {day.rating}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details */}
          {forecast[selectedDay] && (
            <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-200 font-medium">
                  {new Date(forecast[selectedDay].date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${ratingColors[forecast[selectedDay].rating]}`}>
                  {forecast[selectedDay].rating} for Recreation
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <ThermometerSun className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                  <div className="text-slate-200">{forecast[selectedDay].tempHigh}°/{forecast[selectedDay].tempLow}°</div>
                  <div className="text-slate-500">Temp</div>
                </div>
                <div>
                  <Cloud className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <div className="text-slate-200">{forecast[selectedDay].precipProbability}%</div>
                  <div className="text-slate-500">Rain</div>
                </div>
                <div>
                  <Waves className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <div className="text-slate-200">{forecast[selectedDay].windSpeed} mph</div>
                  <div className="text-slate-500">Wind</div>
                </div>
                <div>
                  <Sun className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                  <div className="text-slate-200">{forecast[selectedDay].uvIndex}</div>
                  <div className="text-slate-500">UV</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400 text-center">
                {getWeatherDescription(forecast[selectedDay].weatherCode)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Suggestions */}
      {forecast[0] && (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="text-xs text-slate-400 mb-2">Today&apos;s Best Activities</div>
          <div className="flex flex-wrap gap-1">
            {forecast[0].rating !== 'Poor' && (
              <>
                <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">Fishing</span>
                <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded">Kayaking</span>
              </>
            )}
            {forecast[0].windSpeed < 15 && (
              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">Paddleboarding</span>
            )}
            {forecast[0].precipProbability < 30 && (
              <>
                <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded">Hiking</span>
                <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 rounded">Photography</span>
              </>
            )}
            {forecast[0].uvIndex >= 3 && (
              <span className="text-xs px-2 py-1 bg-orange-500/10 text-orange-400 rounded">Swimming</span>
            )}
            {forecast[0].rating === 'Poor' && (
              <span className="text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded">Indoor activities recommended</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
