'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic3JtNzQ3MDEiLCJhIjoiY21rNXppNjdkMG42MTNmcHQ5bno4OGVqcSJ9.zBjj1qRNuqARjyRdaTuIOQ';

interface LakeMapProps {
  coordinates: { lat: number; lng: number };
  lakeName: string;
  showContours: boolean;
  showZones: boolean;
  floodLevel: number;
  normalPoolElevation: number;
  mapStyle?: 'satellite' | 'terrain' | 'streets';
}

// Sardis Lake approximate boundary polygon (GeoJSON format - lng, lat order)
const SARDIS_LAKE_POLYGON: [number, number][] = [
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
];

// Points of interest around Sardis Lake
const POINTS_OF_INTEREST = [
  { name: 'Sardis Dam', position: [-95.3380, 34.6619] as [number, number], type: 'dam', description: 'Main dam structure, built 1982' },
  { name: 'Potato Hills Marina', position: [-95.4100, 34.6850] as [number, number], type: 'marina', description: 'Full-service marina with boat rentals' },
  { name: 'Pine Creek Cove', position: [-95.3950, 34.6450] as [number, number], type: 'campground', description: 'Camping and day-use area' },
  { name: 'Jackfork Creek Inlet', position: [-95.3600, 34.6970] as [number, number], type: 'inlet', description: 'Primary water source inlet' },
  { name: 'Wildlife Area', position: [-95.4200, 34.6750] as [number, number], type: 'wildlife', description: 'Protected wildlife observation zone' },
];

// Land use zones (GeoJSON format)
const LAND_USE_ZONES = [
  {
    id: 'conservation',
    name: 'Conservation Area',
    color: '#2d6a4f',
    polygon: [
      [-95.4100, 34.6950],
      [-95.4200, 34.6900],
      [-95.4250, 34.6800],
      [-95.4200, 34.6750],
      [-95.4100, 34.6800],
      [-95.4050, 34.6900],
      [-95.4100, 34.6950],
    ] as [number, number][],
  },
  {
    id: 'recreation',
    name: 'Recreation Zone',
    color: '#40916c',
    polygon: [
      [-95.3850, 34.6550],
      [-95.3950, 34.6500],
      [-95.4000, 34.6450],
      [-95.3950, 34.6400],
      [-95.3850, 34.6450],
      [-95.3800, 34.6500],
      [-95.3850, 34.6550],
    ] as [number, number][],
  },
  {
    id: 'wildlife',
    name: 'Wildlife Habitat',
    color: '#74c69d',
    polygon: [
      [-95.3500, 34.6850],
      [-95.3550, 34.6800],
      [-95.3500, 34.6750],
      [-95.3450, 34.6700],
      [-95.3400, 34.6750],
      [-95.3450, 34.6800],
      [-95.3500, 34.6850],
    ] as [number, number][],
  },
];

// Depth contour rings (simulated bathymetry)
const DEPTH_CONTOURS = [
  { depth: 55, color: '#1a365d', scale: 0.3 },
  { depth: 40, color: '#2c5282', scale: 0.5 },
  { depth: 25, color: '#3182ce', scale: 0.7 },
  { depth: 10, color: '#63b3ed', scale: 0.85 },
];

// Map style URLs (defined outside component to avoid re-creation)
const MAP_STYLES: Record<string, string> = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
};

export default function LakeMap({
  coordinates,
  lakeName,
  showContours,
  showZones,
  floodLevel,
  normalPoolElevation,
  mapStyle = 'satellite',
}: LakeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [currentStyle, setCurrentStyle] = useState(mapStyle);

  // Function to add data layers - defined with useCallback to avoid re-creation
  const addDataLayers = useCallback((map: mapboxgl.Map) => {
    // Add 3D terrain if available
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
    }

    // Add sky layer for 3D effect
    if (!map.getLayer('sky')) {
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });
    }

    // Add lake boundary source
    if (!map.getSource('lake-boundary')) {
      map.addSource('lake-boundary', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: lakeName },
          geometry: {
            type: 'Polygon',
            coordinates: [SARDIS_LAKE_POLYGON],
          },
        },
      });
    }

    // Add lake fill layer
    if (!map.getLayer('lake-fill')) {
      map.addLayer({
        id: 'lake-fill',
        type: 'fill',
        source: 'lake-boundary',
        paint: {
          'fill-color': floodLevel > normalPoolElevation ? '#ffc107' : '#3182ce',
          'fill-opacity': 0.3,
        },
      });
    }

    // Add lake outline layer
    if (!map.getLayer('lake-outline')) {
      map.addLayer({
        id: 'lake-outline',
        type: 'line',
        source: 'lake-boundary',
        paint: {
          'line-color': floodLevel > normalPoolElevation ? '#ff9800' : '#1e40af',
          'line-width': 3,
        },
      });
    }

    // Add points of interest
    POINTS_OF_INTEREST.forEach((poi) => {
      const markerEl = document.createElement('div');
      markerEl.className = 'poi-marker';
      
      const iconColors: Record<string, string> = {
        dam: '#6b7280',
        marina: '#0ea5e9',
        campground: '#22c55e',
        inlet: '#3b82f6',
        wildlife: '#84cc16',
      };
      
      const icons: Record<string, string> = {
        dam: '🔒',
        marina: '⚓',
        campground: '🏕️',
        inlet: '💧',
        wildlife: '🦌',
      };

      markerEl.innerHTML = `
        <div style="
          background: ${iconColors[poi.type]};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          font-size: 16px;
          cursor: pointer;
        ">
          ${icons[poi.type]}
        </div>
      `;

      new mapboxgl.Marker(markerEl)
        .setLngLat(poi.position)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px;">
              <strong style="font-size: 14px;">${poi.name}</strong>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${poi.description}</p>
            </div>
          `)
        )
        .addTo(map);
    });
  }, [lakeName, floodLevel, normalPoolElevation]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[currentStyle],
      center: [coordinates.lng, coordinates.lat],
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Track zoom changes
    map.on('zoom', () => {
      setCurrentZoom(Math.round(map.getZoom()));
    });

    // When style loads, add data layers
    map.on('style.load', () => {
      addDataLayers(map);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coordinates.lat, coordinates.lng, currentStyle, addDataLayers]);

  // Update layers when props change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Update lake fill color based on flood level
    if (map.getLayer('lake-fill')) {
      map.setPaintProperty(
        'lake-fill',
        'fill-color',
        floodLevel > normalPoolElevation ? '#ffc107' : '#3182ce'
      );
      map.setPaintProperty(
        'lake-fill',
        'fill-opacity',
        floodLevel > normalPoolElevation ? 0.5 : 0.3
      );
    }

    if (map.getLayer('lake-outline')) {
      map.setPaintProperty(
        'lake-outline',
        'line-color',
        floodLevel > normalPoolElevation ? '#ff9800' : '#1e40af'
      );
      map.setPaintProperty(
        'lake-outline',
        'line-width',
        floodLevel > normalPoolElevation ? 4 : 3
      );
    }

    // Handle contours visibility
    DEPTH_CONTOURS.forEach((contour, index) => {
      const layerId = `contour-${index}`;
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', showContours ? 'visible' : 'none');
      }
    });

    // Handle zones visibility
    LAND_USE_ZONES.forEach((zone) => {
      const fillLayerId = `zone-fill-${zone.id}`;
      const outlineLayerId = `zone-outline-${zone.id}`;
      if (map.getLayer(fillLayerId)) {
        map.setLayoutProperty(fillLayerId, 'visibility', showZones ? 'visible' : 'none');
      }
      if (map.getLayer(outlineLayerId)) {
        map.setLayoutProperty(outlineLayerId, 'visibility', showZones ? 'visible' : 'none');
      }
    });

  }, [floodLevel, normalPoolElevation, showContours, showZones]);

  // Add contour and zone layers after initial load
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const addAdditionalLayers = () => {
      // Add depth contour layers
      DEPTH_CONTOURS.forEach((contour, index) => {
        const sourceId = `contour-source-${index}`;
        const layerId = `contour-${index}`;

        if (!map.getSource(sourceId)) {
          // Create scaled polygon for contour
          const scaledPolygon = SARDIS_LAKE_POLYGON.map(([lng, lat]) => {
            const centerLng = coordinates.lng;
            const centerLat = coordinates.lat;
            return [
              centerLng + (lng - centerLng) * contour.scale,
              centerLat + (lat - centerLat) * contour.scale,
            ] as [number, number];
          });

          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { depth: contour.depth },
              geometry: {
                type: 'Polygon',
                coordinates: [scaledPolygon],
              },
            },
          });

          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
              visibility: showContours ? 'visible' : 'none',
            },
            paint: {
              'line-color': contour.color,
              'line-width': 2,
              'line-dasharray': [2, 2],
            },
          });
        }
      });

      // Add land use zone layers
      LAND_USE_ZONES.forEach((zone) => {
        const sourceId = `zone-source-${zone.id}`;
        const fillLayerId = `zone-fill-${zone.id}`;
        const outlineLayerId = `zone-outline-${zone.id}`;

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { name: zone.name },
              geometry: {
                type: 'Polygon',
                coordinates: [zone.polygon],
              },
            },
          });

          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            layout: {
              visibility: showZones ? 'visible' : 'none',
            },
            paint: {
              'fill-color': zone.color,
              'fill-opacity': 0.4,
            },
          });

          map.addLayer({
            id: outlineLayerId,
            type: 'line',
            source: sourceId,
            layout: {
              visibility: showZones ? 'visible' : 'none',
            },
            paint: {
              'line-color': zone.color,
              'line-width': 2,
            },
          });
        }
      });

      // Add flood warning layer if above normal
      if (floodLevel > normalPoolElevation) {
        const floodSourceId = 'flood-warning-source';
        const floodLayerId = 'flood-warning';

        if (!map.getSource(floodSourceId)) {
          // Expand polygon based on flood level
          const expansionFactor = 1 + ((floodLevel - normalPoolElevation) / 50);
          const expandedPolygon = SARDIS_LAKE_POLYGON.map(([lng, lat]) => {
            const centerLng = coordinates.lng;
            const centerLat = coordinates.lat;
            return [
              centerLng + (lng - centerLng) * expansionFactor,
              centerLat + (lat - centerLat) * expansionFactor,
            ] as [number, number];
          });

          map.addSource(floodSourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [expandedPolygon],
              },
            },
          });

          map.addLayer({
            id: floodLayerId,
            type: 'line',
            source: floodSourceId,
            paint: {
              'line-color': '#ff9800',
              'line-width': 3,
              'line-dasharray': [4, 2],
            },
          });
        }
      }
    };

    // Wait for style to be loaded
    if (map.isStyleLoaded()) {
      addAdditionalLayers();
    } else {
      map.on('style.load', addAdditionalLayers);
    }
  }, [coordinates, showContours, showZones, floodLevel, normalPoolElevation]);

  // Change map style
  const changeMapStyle = (style: 'satellite' | 'terrain' | 'streets') => {
    if (!mapRef.current) return;
    setCurrentStyle(style);
    mapRef.current.setStyle(MAP_STYLES[style]);
  };

  // Center on lake
  const centerOnLake = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
    });
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
      
      {/* Map style toggle */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-2">
        <div className="text-xs text-slate-400 mb-2 font-medium">Map Style</div>
        <div className="flex gap-1">
          {(['satellite', 'terrain', 'streets'] as const).map((style) => (
            <button
              key={style}
              onClick={() => changeMapStyle(style)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                currentStyle === style
                  ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Center button */}
      <div className="absolute bottom-24 right-4 z-10">
        <button
          onClick={centerOnLake}
          className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-2 hover:bg-slate-800 transition-colors text-slate-400"
          title="Center on Lake"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400">
        Zoom: {currentZoom}
      </div>

      {/* Lake info panel */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3 ml-12">
        <div className="text-xs text-slate-400">
          <div className="text-emerald-400 font-semibold mb-1">{lakeName}</div>
          <div>LAT: {coordinates.lat.toFixed(4)}°N</div>
          <div>LNG: {Math.abs(coordinates.lng).toFixed(4)}°W</div>
          {floodLevel > normalPoolElevation && (
            <div className="text-yellow-400 mt-1 flex items-center gap-1">
              ⚠️ +{floodLevel - normalPoolElevation} ft above normal
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-20 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3 mt-2">
        <div className="text-xs text-slate-400 font-medium mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500/50 border border-blue-600"></div>
            <span className="text-slate-300">Lake Surface</span>
          </div>
          {showContours && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0 border-t-2 border-dashed border-blue-800"></div>
              <span className="text-slate-300">Depth Contours</span>
            </div>
          )}
          {showZones && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-600/50"></div>
              <span className="text-slate-300">Land Use Zones</span>
            </div>
          )}
          {floodLevel > normalPoolElevation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0 border-t-2 border-dashed border-orange-500"></div>
              <span className="text-yellow-400">Flood Zone</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
