import { NextRequest, NextResponse } from 'next/server';

// USGS Water Services API proxy
// Fetches real-time water level data from USGS monitoring stations

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const siteId = searchParams.get('site') || '07335700';
  const period = searchParams.get('period') || 'P7D';
  const parameterCd = searchParams.get('parameterCd') || '00065,62614';

  try {
    // USGS Water Services API
    // Parameter codes:
    // 00065 = Gage height (feet)
    // 62614 = Lake or reservoir water surface elevation above NGVD 1929 (feet)
    const usgsUrl = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${siteId}&parameterCd=${parameterCd}&period=${period}`;

    const response = await fetch(usgsUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LakeScope/1.0 (Environmental Analysis Platform)',
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      // Try alternative USGS site for Sardis Lake area
      // Sites near Sardis Lake, OK:
      // 07335700 - Sardis Lake near Clayton
      // 07335790 - Jackfork Creek near Clayton
      const altSites = ['07335790', '07335500', '07336200'];

      for (const altSite of altSites) {
        const altUrl = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${altSite}&parameterCd=00065&period=${period}`;
        const altResponse = await fetch(altUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'LakeScope/1.0',
          },
        });

        if (altResponse.ok) {
          const data = await altResponse.json();
          return NextResponse.json({
            ...data,
            meta: {
              source: 'USGS',
              siteId: altSite,
              fallback: true,
              note: `Primary site ${siteId} unavailable, using nearby station ${altSite}`
            }
          });
        }
      }

      throw new Error(`USGS API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      ...data,
      meta: {
        source: 'USGS',
        siteId,
        timestamp: new Date().toISOString(),
        fallback: false,
      }
    });

  } catch (error) {
    console.error('USGS API error:', error);

    // Return error with helpful info
    return NextResponse.json(
      {
        error: 'Failed to fetch USGS data',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'The USGS site may be temporarily unavailable. Try again later.',
        availableSites: [
          { id: '07335700', name: 'Sardis Lake near Clayton, OK' },
          { id: '07335790', name: 'Jackfork Creek near Clayton, OK' },
        ],
      },
      { status: 502 }
    );
  }
}
