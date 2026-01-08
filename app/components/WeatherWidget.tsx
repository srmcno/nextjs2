'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets,
  Thermometer, Eye, RefreshCw, Gauge, Sunrise, Sunset,
  CloudFog, CloudLightning, CloudDrizzle
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  precipitation: number;
  cloudCover: number;
  visibility: number;
  pressure: number;
  uvIndex: number;
  weatherCode: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
}

interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
}

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  locationName: string;
}

// Weather code to description and icon mapping
const getWeatherInfo = (code: number, isDay: boolean) => {
  const weatherMap: Record<number, { description: string; icon: React.ComponentType<{ className?: string }> }> = {
    0: { description: 'Clear sky', icon: Sun },
    1: { description: 'Mainly clear', icon: Sun },
    2: { description: 'Partly cloudy', icon: Cloud },
    3: { description: 'Overcast', icon: Cloud },
    45: { description: 'Foggy', icon: CloudFog },
    48: { description: 'Depositing rime fog', icon: CloudFog },
    51: { description: 'Light drizzle', icon: CloudDrizzle },
    53: { description: 'Moderate drizzle', icon: CloudDrizzle },
    55: { description: 'Dense drizzle', icon: CloudDrizzle },
    61: { description: 'Slight rain', icon: CloudRain },
    63: { description: 'Moderate rain', icon: CloudRain },
    65: { description: 'Heavy rain', icon: CloudRain },
    71: { description: 'Slight snow', icon: CloudSnow },
    73: { description: 'Moderate snow', icon: CloudSnow },
    75: { description: 'Heavy snow', icon: CloudSnow },
    80: { description: 'Slight rain showers', icon: CloudRain },
    81: { description: 'Moderate rain showers', icon: CloudRain },
    82: { description: 'Violent rain showers', icon: CloudRain },
    95: { description: 'Thunderstorm', icon: CloudLightning },
    96: { description: 'Thunderstorm with hail', icon: CloudLightning },
    99: { description: 'Thunderstorm with heavy hail', icon: CloudLightning },
  };

  return weatherMap[code] || { description: 'Unknown', icon: Cloud };
};

const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export default function WeatherWidget({ lat, lng, locationName }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Open-Meteo API - Free, no API key required
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index,is_day` +
        `&hourly=temperature_2m,weather_code,precipitation_probability` +
        `&daily=sunrise,sunset` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
        `&timezone=America/Chicago&forecast_days=1`
      );

      if (!response.ok) {
        throw new Error('Weather data unavailable');
      }

      const data = await response.json();

      setWeather({
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        windGusts: data.current.wind_gusts_10m,
        precipitation: data.current.precipitation,
        cloudCover: data.current.cloud_cover,
        visibility: data.current.visibility / 1609.34, // Convert meters to miles
        pressure: data.current.pressure_msl * 0.02953, // Convert hPa to inHg
        uvIndex: data.current.uv_index,
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        sunrise: data.daily.sunrise[0],
        sunset: data.daily.sunset[0],
      });

      // Get next 12 hours of forecast
      const currentHour = new Date().getHours();
      const hourlyData: HourlyForecast[] = [];
      for (let i = currentHour; i < currentHour + 12 && i < 24; i++) {
        hourlyData.push({
          time: data.hourly.time[i],
          temperature: data.hourly.temperature_2m[i],
          weatherCode: data.hourly.weather_code[i],
          precipitationProbability: data.hourly.precipitation_probability[i],
        });
      }
      setHourlyForecast(hourlyData);

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (loading && !weather) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
        <div className="text-red-400 text-sm">{error}</div>
        <button onClick={fetchWeather} className="text-xs text-red-300 hover:text-red-200 underline mt-2">
          Retry
        </button>
      </div>
    );
  }

  if (!weather) return null;

  const weatherInfo = getWeatherInfo(weather.weatherCode, weather.isDay);
  const WeatherIcon = weatherInfo.icon;

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-3">
      {/* Main Weather Card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-emerald-400 font-semibold flex items-center gap-2">
            <Cloud className="w-4 h-4" /> Lake Weather
          </h4>
          <button
            onClick={fetchWeather}
            className="text-slate-400 hover:text-emerald-400 transition-colors"
            title="Refresh weather"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Current Conditions */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <WeatherIcon className="w-12 h-12 text-cyan-400" />
            <div>
              <div className="text-3xl font-bold text-white">
                {Math.round(weather.temperature)}°F
              </div>
              <div className="text-slate-400 text-sm">{weatherInfo.description}</div>
            </div>
          </div>
          <div className="flex-1 text-right">
            <div className="text-slate-400 text-xs">Feels like</div>
            <div className="text-lg text-slate-200">{Math.round(weather.feelsLike)}°F</div>
          </div>
        </div>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-900/50 rounded p-2 text-center">
            <Wind className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <div className="text-sm text-slate-200">{Math.round(weather.windSpeed)} mph</div>
            <div className="text-xs text-slate-500">{getWindDirection(weather.windDirection)}</div>
          </div>
          <div className="bg-slate-900/50 rounded p-2 text-center">
            <Droplets className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-sm text-slate-200">{weather.humidity}%</div>
            <div className="text-xs text-slate-500">Humidity</div>
          </div>
          <div className="bg-slate-900/50 rounded p-2 text-center">
            <Gauge className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-sm text-slate-200">{weather.pressure.toFixed(2)}</div>
            <div className="text-xs text-slate-500">inHg</div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-slate-900/30 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Visibility
            </span>
            <span className="text-slate-200">{weather.visibility.toFixed(1)} mi</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-900/30 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <Wind className="w-3 h-3" /> Gusts
            </span>
            <span className="text-slate-200">{Math.round(weather.windGusts)} mph</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-900/30 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <Cloud className="w-3 h-3" /> Cloud Cover
            </span>
            <span className="text-slate-200">{weather.cloudCover}%</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-900/30 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <Sun className="w-3 h-3" /> UV Index
            </span>
            <span className={`${weather.uvIndex >= 8 ? 'text-red-400' : weather.uvIndex >= 6 ? 'text-orange-400' : weather.uvIndex >= 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {weather.uvIndex} {weather.uvIndex >= 8 ? '(Very High)' : weather.uvIndex >= 6 ? '(High)' : weather.uvIndex >= 3 ? '(Moderate)' : '(Low)'}
            </span>
          </div>
        </div>

        {/* Sunrise/Sunset */}
        <div className="flex justify-between mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <Sunrise className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-slate-300">{formatTime(weather.sunrise)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sunset className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-300">{formatTime(weather.sunset)}</span>
          </div>
        </div>
      </div>

      {/* Hourly Forecast */}
      {hourlyForecast.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <h5 className="text-slate-400 text-xs font-medium mb-2">Next Hours</h5>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {hourlyForecast.slice(0, 8).map((hour, idx) => {
              const HourIcon = getWeatherInfo(hour.weatherCode, true).icon;
              return (
                <div key={idx} className="flex-shrink-0 text-center p-2 bg-slate-900/50 rounded min-w-[50px]">
                  <div className="text-xs text-slate-500">
                    {idx === 0 ? 'Now' : formatTime(hour.time).replace(':00', '')}
                  </div>
                  <HourIcon className="w-5 h-5 text-slate-400 mx-auto my-1" />
                  <div className="text-sm text-slate-200">{Math.round(hour.temperature)}°</div>
                  {hour.precipitationProbability > 0 && (
                    <div className="text-xs text-cyan-400">{hour.precipitationProbability}%</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Boating Conditions Advisory */}
      {(weather.windSpeed > 15 || weather.windGusts > 25) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="text-yellow-400 text-sm font-medium">Boating Advisory</div>
          <p className="text-yellow-300/80 text-xs mt-1">
            {weather.windGusts > 25
              ? `Strong wind gusts up to ${Math.round(weather.windGusts)} mph. Small craft should use caution.`
              : `Winds ${Math.round(weather.windSpeed)} mph. Check conditions before heading out.`
            }
          </p>
        </div>
      )}

      {/* Attribution */}
      <div className="text-xs text-slate-500 flex items-center justify-between">
        <span>Weather: Open-Meteo</span>
        {lastUpdated && (
          <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}
