import { NextRequest, NextResponse } from 'next/server';

// Open-Meteo Weather API proxy
// Provides real-time weather and forecast data

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat') || '34.6619';
  const lng = searchParams.get('lng') || '-95.3890';
  const forecast = searchParams.get('forecast') || '7';

  try {
    // Open-Meteo API - free, no API key required
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude', lat);
    weatherUrl.searchParams.set('longitude', lng);
    weatherUrl.searchParams.set('current', [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'visibility',
      'uv_index',
      'is_day'
    ].join(','));
    weatherUrl.searchParams.set('hourly', [
      'temperature_2m',
      'weather_code',
      'precipitation_probability',
      'wind_speed_10m'
    ].join(','));
    weatherUrl.searchParams.set('daily', [
      'sunrise',
      'sunset',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'weather_code',
      'wind_speed_10m_max',
      'uv_index_max'
    ].join(','));
    weatherUrl.searchParams.set('temperature_unit', 'fahrenheit');
    weatherUrl.searchParams.set('wind_speed_unit', 'mph');
    weatherUrl.searchParams.set('precipitation_unit', 'inch');
    weatherUrl.searchParams.set('timezone', 'America/Chicago');
    weatherUrl.searchParams.set('forecast_days', forecast);

    const response = await fetch(weatherUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 15 minutes
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      ...data,
      meta: {
        source: 'Open-Meteo',
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Weather API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch weather data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
