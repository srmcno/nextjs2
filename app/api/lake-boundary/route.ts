import { NextRequest, NextResponse } from 'next/server';

// Fetches real lake boundary from OpenStreetMap via Overpass API
// Returns GeoJSON polygon for the lake

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lakeName = searchParams.get('name') || 'Sardis Lake';
  const lat = searchParams.get('lat') || '34.6619';
  const lng = searchParams.get('lng') || '-95.3890';

  try {
    // Overpass API query to find lake boundary
    // Searches for water bodies named "Sardis Lake" near the coordinates
    const overpassQuery = `
      [out:json][timeout:30];
      (
        way["natural"="water"]["name"~"Sardis",i](around:20000,${lat},${lng});
        relation["natural"="water"]["name"~"Sardis",i](around:20000,${lat},${lng});
        way["water"="reservoir"]["name"~"Sardis",i](around:20000,${lat},${lng});
        relation["water"="reservoir"]["name"~"Sardis",i](around:20000,${lat},${lng});
      );
      out body geom;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';

    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      // Cache for 1 day (lake boundaries don't change often)
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`Overpass API returned ${response.status}`);
    }

    const data = await response.json();

    // Convert OSM data to GeoJSON
    const features: GeoJSON.Feature[] = [];

    for (const element of data.elements) {
      if (element.type === 'way' && element.geometry) {
        // Extract coordinates from way geometry
        const coordinates = element.geometry.map((node: { lat: number; lon: number }) => [
          node.lon,
          node.lat,
        ]);

        // Close the polygon if not already closed
        if (coordinates.length > 0) {
          const first = coordinates[0];
          const last = coordinates[coordinates.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coordinates.push([...first]);
          }
        }

        features.push({
          type: 'Feature',
          properties: {
            name: element.tags?.name || lakeName,
            type: element.tags?.natural || element.tags?.water || 'water',
            osm_id: element.id,
            source: 'OpenStreetMap',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        });
      } else if (element.type === 'relation' && element.members) {
        // Handle multipolygon relations
        const outerRings: [number, number][][] = [];

        for (const member of element.members) {
          if (member.type === 'way' && member.role === 'outer' && member.geometry) {
            const coordinates = member.geometry.map((node: { lat: number; lon: number }) => [
              node.lon,
              node.lat,
            ] as [number, number]);
            outerRings.push(coordinates);
          }
        }

        if (outerRings.length > 0) {
          // Merge outer rings if they share endpoints
          const mergedRing = mergeRings(outerRings);

          features.push({
            type: 'Feature',
            properties: {
              name: element.tags?.name || lakeName,
              type: element.tags?.natural || element.tags?.water || 'water',
              osm_id: element.id,
              source: 'OpenStreetMap',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [mergedRing],
            },
          });
        }
      }
    }

    if (features.length === 0) {
      // Return a fallback approximate boundary if OSM doesn't have data
      return NextResponse.json({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            name: lakeName,
            source: 'approximate',
            note: 'OpenStreetMap boundary not found, using approximate boundary',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-95.3620, 34.6956],
              [-95.3502, 34.6912],
              [-95.3415, 34.6845],
              [-95.3380, 34.6778],
              [-95.3395, 34.6695],
              [-95.3448, 34.6612],
              [-95.3532, 34.6545],
              [-95.3648, 34.6495],
              [-95.3785, 34.6462],
              [-95.3925, 34.6445],
              [-95.4068, 34.6462],
              [-95.4185, 34.6512],
              [-95.4262, 34.6595],
              [-95.4295, 34.6695],
              [-95.4278, 34.6795],
              [-95.4215, 34.6878],
              [-95.4112, 34.6945],
              [-95.3985, 34.6978],
              [-95.3848, 34.6978],
              [-95.3720, 34.6956],
              [-95.3620, 34.6956],
            ]],
          },
        }],
        meta: {
          source: 'fallback',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
      meta: {
        source: 'OpenStreetMap',
        query: lakeName,
        timestamp: new Date().toISOString(),
        count: features.length,
      },
    });

  } catch (error) {
    console.error('Lake boundary API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch lake boundary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}

// Helper function to merge connected ring segments
function mergeRings(rings: [number, number][][]): [number, number][] {
  if (rings.length === 0) return [];
  if (rings.length === 1) return rings[0];

  const merged = [...rings[0]];
  const remaining = rings.slice(1);

  let changed = true;
  while (changed && remaining.length > 0) {
    changed = false;

    for (let i = 0; i < remaining.length; i++) {
      const ring = remaining[i];
      const mergedStart = merged[0];
      const mergedEnd = merged[merged.length - 1];
      const ringStart = ring[0];
      const ringEnd = ring[ring.length - 1];

      const tolerance = 0.0001; // About 10 meters

      // Check if ring connects to end of merged
      if (
        Math.abs(mergedEnd[0] - ringStart[0]) < tolerance &&
        Math.abs(mergedEnd[1] - ringStart[1]) < tolerance
      ) {
        merged.push(...ring.slice(1));
        remaining.splice(i, 1);
        changed = true;
        break;
      }

      // Check if ring connects to start of merged
      if (
        Math.abs(mergedStart[0] - ringEnd[0]) < tolerance &&
        Math.abs(mergedStart[1] - ringEnd[1]) < tolerance
      ) {
        merged.unshift(...ring.slice(0, -1));
        remaining.splice(i, 1);
        changed = true;
        break;
      }

      // Check reverse connections
      if (
        Math.abs(mergedEnd[0] - ringEnd[0]) < tolerance &&
        Math.abs(mergedEnd[1] - ringEnd[1]) < tolerance
      ) {
        merged.push(...ring.reverse().slice(1));
        remaining.splice(i, 1);
        changed = true;
        break;
      }

      if (
        Math.abs(mergedStart[0] - ringStart[0]) < tolerance &&
        Math.abs(mergedStart[1] - ringStart[1]) < tolerance
      ) {
        merged.unshift(...ring.reverse().slice(0, -1));
        remaining.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  // Close the ring
  if (merged.length > 0) {
    const first = merged[0];
    const last = merged[merged.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      merged.push([...first] as [number, number]);
    }
  }

  return merged;
}
