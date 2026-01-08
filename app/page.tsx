import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Layers, TrendingUp, Building2, Droplets, Fish, TreePine, Mountain, ChevronDown, ChevronUp, Info, Download, Settings, BarChart3, Map, Navigation, Ruler, AlertTriangle, Sun, Cloud, Wind, Activity, Database, FileText, Camera, Share2, Bookmark, Search, Filter, Eye, EyeOff, Plus, Minus, Crosshair, Globe, Compass, LayoutGrid, Maximize2 } from 'lucide-react';

// Sardis Lake Data
const SARDIS_LAKE_DATA = {
  name: "Sardis Lake",
  state: "Oklahoma",
  county: "Pushmataha/Latimer",
  coordinates: { lat: 34.6619, lng: -95.3890 },
  normalPoolElevation: 599, // feet above sea level
  floodStageElevation: 607,
  streamBedElevation: 530,
  topOfDamElevation: 631,
  surfaceArea: 14360, // acres
  shorelineLength: 117, // miles
  maxDepth: 55.2, // feet
  volume: 274330, // acre-feet
  drainageArea: 275, // square miles
  yearCreated: 1982,
  managedBy: "U.S. Army Corps of Engineers",
  primaryPurpose: "Water Supply",
  tributaries: ["Jackfork Creek"],
  basin: "Kiamichi Basin"
};

// Elevation contour data (simulated)
const ELEVATION_CONTOURS = [
  { elevation: 530, color: '#1a365d', label: 'Streambed', depth: 69 },
  { elevation: 545, color: '#2c5282', label: 'Deep', depth: 54 },
  { elevation: 560, color: '#2b6cb0', label: 'Mid-Deep', depth: 39 },
  { elevation: 575, color: '#3182ce', label: 'Mid', depth: 24 },
  { elevation: 585, color: '#4299e1', label: 'Shallow', depth: 14 },
  { elevation: 595, color: '#63b3ed', label: 'Very Shallow', depth: 4 },
  { elevation: 599, color: '#90cdf4', label: 'Normal Pool', depth: 0 },
  { elevation: 607, color: '#ffc107', label: 'Flood Stage', depth: -8 },
  { elevation: 620, color: '#ff9800', label: 'High Flood', depth: -21 },
  { elevation: 631, color: '#f44336', label: 'Dam Crest', depth: -32 },
];

// Land use zones
const LAND_USE_ZONES = [
  { id: 'conservation', name: 'Conservation Area', acres: 8435, color: '#2d6a4f' },
  { id: 'recreation', name: 'Recreation Zone', acres: 2100, color: '#40916c' },
  { id: 'campground', name: 'Campgrounds', acres: 450, color: '#52b788' },
  { id: 'wildlife', name: 'Wildlife Habitat', acres: 3500, color: '#74c69d' },
  { id: 'buffer', name: 'Buffer Zone', acres: 1200, color: '#95d5b2' },
];

// Economic indicators
const ECONOMIC_DATA = {
  annualVisitors: 425000,
  economicImpact: 28.5, // millions
  directJobs: 145,
  indirectJobs: 380,
  propertyTaxRevenue: 2.4, // millions
  waterContractValue: 12.8, // millions per year
  recreationRevenue: 4.2, // millions
  averagePropertyValue: 185000,
  propertyValueGrowth: 4.2, // percent annually
};

// Water quality data
const WATER_QUALITY = {
  ph: 7.4,
  dissolvedOxygen: 8.2,
  turbidity: 12,
  temperature: 68,
  conductivity: 245,
  chlorophyll: 4.8,
  secchiDepth: 8.5,
  rating: 'Good'
};

export default function LakeAnalysisPlatform() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedElevation, setSelectedElevation] = useState(599);
  const [showContours, setShowContours] = useState(true);
  const [showZones, setShowZones] = useState(false);
  const [mapStyle, setMapStyle] = useState('topographic');
  const [analysisMode, setAnalysisMode] = useState(null);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [floodLevel, setFloodLevel] = useState(599);
  const [panelExpanded, setPanelExpanded] = useState({ info: true, layers: false, analysis: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const canvasRef = useRef(null);

  // Calculate flood impact
  const calculateFloodImpact = useCallback((elevation) => {
    const normalPool = SARDIS_LAKE_DATA.normalPoolElevation;
    const difference = elevation - normalPool;
    const additionalAcres = difference > 0 ? Math.round(difference * 180) : 0;
    const impactedStructures = difference > 5 ? Math.round((difference - 5) * 12) : 0;
    const evacuationZone = difference > 8 ? Math.round((difference - 8) * 0.5) : 0;
    return { additionalAcres, impactedStructures, evacuationZone, difference };
  }, []);

  const floodImpact = calculateFloodImpact(floodLevel);

  // Draw map visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, width, height);

    // Draw terrain background
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, 400);
    gradient.addColorStop(0, '#1a2f23');
    gradient.addColorStop(0.5, '#152419');
    gradient.addColorStop(1, '#0f1419');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(100, 200, 150, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Lake shape (stylized representation of Sardis Lake)
    const centerX = width / 2;
    const centerY = height / 2;
    
    if (showContours) {
      // Draw elevation contours from deep to shallow
      ELEVATION_CONTOURS.slice().reverse().forEach((contour, index) => {
        if (contour.elevation <= floodLevel) {
          const scale = 0.3 + (contour.elevation - 530) / 150;
          ctx.save();
          ctx.translate(centerX, centerY);
          
          ctx.beginPath();
          // Create irregular lake shape
          const points = 60;
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const baseRadius = 120 * scale;
            const variance = Math.sin(angle * 3) * 20 + Math.cos(angle * 5) * 15 + Math.sin(angle * 7) * 10;
            const elongation = 1.4 + Math.sin(angle) * 0.3;
            const r = (baseRadius + variance * scale) * elongation;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r * 0.7;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          
          ctx.fillStyle = contour.color + (index === 0 ? 'ff' : 'cc');
          ctx.fill();
          
          // Draw contour line
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          ctx.restore();
        }
      });
    }

    // Draw flood level indicator
    if (floodLevel > 599) {
      const floodScale = 0.3 + (floodLevel - 530) / 150;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      const points = 60;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const baseRadius = 120 * floodScale;
        const variance = Math.sin(angle * 3) * 20 + Math.cos(angle * 5) * 15;
        const elongation = 1.4 + Math.sin(angle) * 0.3;
        const r = (baseRadius + variance * floodScale) * elongation;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * 0.7;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#ffc107';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.stroke();
      ctx.restore();
    }

    // Draw land use zones
    if (showZones) {
      const zonePositions = [
        { x: centerX - 180, y: centerY - 100, w: 60, h: 80 },
        { x: centerX + 140, y: centerY - 60, w: 70, h: 60 },
        { x: centerX - 160, y: centerY + 80, w: 50, h: 50 },
        { x: centerX + 100, y: centerY + 100, w: 80, h: 40 },
        { x: centerX - 20, y: centerY - 180, w: 60, h: 40 },
      ];
      
      LAND_USE_ZONES.forEach((zone, i) => {
        const pos = zonePositions[i];
        ctx.fillStyle = zone.color + '80';
        ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      });
    }

    // Draw dam
    ctx.save();
    ctx.translate(centerX + 160, centerY + 30);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(-5, -30, 10, 60);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(-8, -35, 16, 8);
    ctx.restore();

    // Draw compass rose
    ctx.save();
    ctx.translate(width - 50, 50);
    ctx.strokeStyle = 'rgba(100, 200, 150, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 20);
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    ctx.fillStyle = '#64c896';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -25);
    ctx.restore();

    // Draw scale bar
    ctx.save();
    ctx.translate(50, height - 30);
    ctx.strokeStyle = 'rgba(100, 200, 150, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.moveTo(100, -5);
    ctx.lineTo(100, 5);
    ctx.stroke();
    ctx.fillStyle = '#64c896';
    ctx.font = '10px monospace';
    ctx.fillText('2 mi', 50, 15);
    ctx.restore();

    // Draw coordinate display
    ctx.fillStyle = '#64c896';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LAT: ${SARDIS_LAKE_DATA.coordinates.lat.toFixed(4)}°N`, 15, 25);
    ctx.fillText(`LNG: ${Math.abs(SARDIS_LAKE_DATA.coordinates.lng).toFixed(4)}°W`, 15, 40);

  }, [showContours, showZones, floodLevel]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'elevation', label: 'Elevation', icon: Mountain },
    { id: 'economic', label: 'Economic', icon: TrendingUp },
    { id: 'planning', label: 'Land Planning', icon: Building2 },
    { id: 'water', label: 'Water Data', icon: Droplets },
    { id: 'analysis', label: 'Analysis Tools', icon: BarChart3 },
  ];

  const togglePanel = (panel) => {
    setPanelExpanded(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={MapPin} label="Location" value="Clayton, OK" sub="Pushmataha County" />
        <StatCard icon={Droplets} label="Surface Area" value="14,360" sub="acres" />
        <StatCard icon={Ruler} label="Shoreline" value="117" sub="miles" />
        <StatCard icon={Mountain} label="Max Depth" value="55.2" sub="feet" />
        <StatCard icon={Activity} label="Volume" value="274,330" sub="acre-feet" />
        <StatCard icon={Navigation} label="Drainage" value="275" sub="sq miles" />
      </div>
      
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" /> Key Elevations
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Top of Dam</span>
            <span className="text-slate-200 font-mono">{SARDIS_LAKE_DATA.topOfDamElevation} ft</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Flood Stage</span>
            <span className="text-yellow-400 font-mono">{SARDIS_LAKE_DATA.floodStageElevation} ft</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Normal Pool</span>
            <span className="text-cyan-400 font-mono">{SARDIS_LAKE_DATA.normalPoolElevation} ft</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Streambed</span>
            <span className="text-blue-400 font-mono">{SARDIS_LAKE_DATA.streamBedElevation} ft</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" /> Quick Facts
        </h4>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            Created in {SARDIS_LAKE_DATA.yearCreated} by damming Jackfork Creek
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            Part of the Kiamichi Basin water system
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            Managed by {SARDIS_LAKE_DATA.managedBy}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            Primary purpose: Municipal water supply
          </li>
        </ul>
      </div>
    </div>
  );

  const renderElevation = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Elevation Contours
        </h4>
        <div className="space-y-2">
          {ELEVATION_CONTOURS.map((contour) => (
            <div 
              key={contour.elevation}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${
                selectedElevation === contour.elevation 
                  ? 'bg-slate-700 ring-1 ring-emerald-500' 
                  : 'hover:bg-slate-700/50'
              }`}
              onClick={() => setSelectedElevation(contour.elevation)}
            >
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: contour.color }}
              />
              <div className="flex-1">
                <div className="text-slate-200 text-sm font-medium">{contour.label}</div>
                <div className="text-slate-500 text-xs">{contour.elevation} ft elevation</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-sm font-mono">
                  {contour.depth > 0 ? `${contour.depth}ft deep` : contour.depth === 0 ? 'Surface' : `+${Math.abs(contour.depth)}ft`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Flood Simulation
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-sm block mb-2">
              Water Level: <span className="text-cyan-400 font-mono">{floodLevel} ft</span>
            </label>
            <input
              type="range"
              min="530"
              max="631"
              value={floodLevel}
              onChange={(e) => setFloodLevel(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>530 ft (bed)</span>
              <span>599 ft (normal)</span>
              <span>631 ft (dam)</span>
            </div>
          </div>
          
          {floodLevel > 599 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
              <div className="text-yellow-400 text-sm font-semibold mb-2">Flood Impact Analysis</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-slate-400">Elevation Above Normal</div>
                  <div className="text-yellow-400 font-mono">+{floodImpact.difference} ft</div>
                </div>
                <div>
                  <div className="text-slate-400">Additional Flooded Area</div>
                  <div className="text-yellow-400 font-mono">~{floodImpact.additionalAcres} acres</div>
                </div>
                <div>
                  <div className="text-slate-400">Structures at Risk</div>
                  <div className="text-orange-400 font-mono">{floodImpact.impactedStructures}</div>
                </div>
                <div>
                  <div className="text-slate-400">Evacuation Zone</div>
                  <div className="text-red-400 font-mono">{floodImpact.evacuationZone} sq mi</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3">Cross-Section Profile</h4>
        <div className="h-32 bg-slate-900 rounded relative overflow-hidden">
          <svg viewBox="0 0 400 100" className="w-full h-full">
            {/* Dam */}
            <polygon points="380,20 390,80 370,80" fill="#6b7280" />
            
            {/* Lake bed profile */}
            <path 
              d="M 20,80 Q 100,85 150,70 T 250,75 T 350,80 L 370,80 L 370,90 L 20,90 Z" 
              fill="#1a365d"
            />
            
            {/* Water level */}
            <rect 
              x="20" y={80 - ((floodLevel - 530) / 101 * 60)} 
              width="350" height={(floodLevel - 530) / 101 * 60} 
              fill="#3182ce" opacity="0.6"
            />
            
            {/* Normal pool line */}
            <line x1="20" y1={80 - ((599 - 530) / 101 * 60)} x2="370" y2={80 - ((599 - 530) / 101 * 60)} 
              stroke="#90cdf4" strokeWidth="1" strokeDasharray="4 2" />
            
            {/* Labels */}
            <text x="10" y="15" fill="#64c896" fontSize="8">Dam: 631ft</text>
            <text x="10" y={80 - ((599 - 530) / 101 * 60) - 3} fill="#90cdf4" fontSize="7">Normal: 599ft</text>
            <text x="10" y="88" fill="#1a365d" fontSize="7">Bed: 530ft</text>
          </svg>
        </div>
      </div>
    </div>
  );

  const renderEconomic = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          icon={TrendingUp} 
          label="Annual Economic Impact" 
          value={`$${ECONOMIC_DATA.economicImpact}M`} 
          sub="regional contribution" 
          highlight
        />
        <StatCard 
          icon={Building2} 
          label="Direct Jobs" 
          value={ECONOMIC_DATA.directJobs} 
          sub={`+${ECONOMIC_DATA.indirectJobs} indirect`}
        />
        <StatCard 
          icon={Droplets} 
          label="Water Contract Value" 
          value={`$${ECONOMIC_DATA.waterContractValue}M`} 
          sub="per year"
        />
        <StatCard 
          icon={Fish} 
          label="Annual Visitors" 
          value={ECONOMIC_DATA.annualVisitors.toLocaleString()} 
          sub="recreational"
        />
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Revenue Breakdown
        </h4>
        <div className="space-y-3">
          {[
            { label: 'Water Sales', value: 12.8, max: 15, color: 'bg-cyan-500' },
            { label: 'Recreation', value: 4.2, max: 15, color: 'bg-emerald-500' },
            { label: 'Property Tax', value: 2.4, max: 15, color: 'bg-yellow-500' },
            { label: 'Permits & Fees', value: 1.8, max: 15, color: 'bg-purple-500' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{item.label}</span>
                <span className="text-slate-400 font-mono">${item.value}M</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(item.value / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Property Analysis
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-slate-400 text-sm">Avg. Lakefront Property</div>
            <div className="text-xl text-slate-200 font-semibold">${ECONOMIC_DATA.averagePropertyValue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-slate-400 text-sm">Annual Growth Rate</div>
            <div className="text-xl text-emerald-400 font-semibold">+{ECONOMIC_DATA.propertyValueGrowth}%</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="text-emerald-400 text-sm font-medium">Investment Outlook</div>
          <div className="text-slate-300 text-sm mt-1">
            Lakefront properties within 1 mile show consistent appreciation above state average
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3">Economic Projections (5-Year)</h4>
        <div className="h-32 bg-slate-900 rounded p-2">
          <svg viewBox="0 0 300 100" className="w-full h-full">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line key={y} x1="30" y1={y} x2="290" y2={y} stroke="#334155" strokeWidth="0.5" />
            ))}
            
            {/* Projection line */}
            <path 
              d="M 30,70 L 90,65 L 150,55 L 210,42 L 270,30" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="2"
            />
            
            {/* Data points */}
            {[[30,70], [90,65], [150,55], [210,42], [270,30]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4" fill="#10b981" />
            ))}
            
            {/* Labels */}
            <text x="30" y="95" fill="#94a3b8" fontSize="8">2025</text>
            <text x="150" y="95" fill="#94a3b8" fontSize="8">2027</text>
            <text x="270" y="95" fill="#94a3b8" fontSize="8">2030</text>
            <text x="5" y="75" fill="#94a3b8" fontSize="7">$28M</text>
            <text x="5" y="35" fill="#94a3b8" fontSize="7">$40M</text>
          </svg>
        </div>
      </div>
    </div>
  );

  const renderPlanning = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" /> Land Use Zones
        </h4>
        <div className="space-y-2">
          {LAND_USE_ZONES.map((zone) => (
            <div 
              key={zone.id}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${
                selectedZone === zone.id 
                  ? 'bg-slate-700 ring-1 ring-emerald-500' 
                  : 'hover:bg-slate-700/50'
              }`}
              onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
            >
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: zone.color }}
              />
              <div className="flex-1">
                <div className="text-slate-200 text-sm">{zone.name}</div>
              </div>
              <div className="text-slate-400 text-sm font-mono">
                {zone.acres.toLocaleString()} ac
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => setShowZones(!showZones)}
          className={`w-full mt-3 py-2 rounded text-sm font-medium transition-all ${
            showZones 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {showZones ? 'Hide' : 'Show'} Zones on Map
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Zoning Regulations
        </h4>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-slate-900 rounded">
            <div className="text-yellow-400 font-medium">Buffer Zone Requirements</div>
            <div className="text-slate-400 mt-1">Minimum 100ft setback from normal pool elevation (599ft)</div>
          </div>
          <div className="p-3 bg-slate-900 rounded">
            <div className="text-cyan-400 font-medium">Flood Plain Restrictions</div>
            <div className="text-slate-400 mt-1">No permanent structures below 610ft elevation</div>
          </div>
          <div className="p-3 bg-slate-900 rounded">
            <div className="text-emerald-400 font-medium">Conservation Easements</div>
            <div className="text-slate-400 mt-1">8,435 acres designated wildlife habitat</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3">Development Potential</h4>
        <div className="space-y-3">
          {[
            { label: 'Developable Shoreline', value: 32, unit: 'miles', status: 'Available' },
            { label: 'Commercial Zones', value: 4, unit: 'sites', status: 'Permitted' },
            { label: 'Marina Locations', value: 2, unit: 'approved', status: 'Active' },
            { label: 'Recreation Expansion', value: 850, unit: 'acres', status: 'Planned' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-2 bg-slate-900 rounded">
              <div>
                <div className="text-slate-200 text-sm">{item.label}</div>
                <div className="text-slate-500 text-xs">{item.status}</div>
              </div>
              <div className="text-emerald-400 font-mono text-sm">
                {item.value} {item.unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <TreePine className="w-4 h-4" /> Environmental Constraints
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Protected wetlands: 1,200 acres
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            Critical habitat zones: 3 designated
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Archaeological sites: 12 registered
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Tribal lands buffer: Active agreement
          </div>
        </div>
      </div>
    </div>
  );

  const renderWater = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Activity} label="pH Level" value={WATER_QUALITY.ph} sub="neutral range" />
        <StatCard icon={Wind} label="Dissolved O₂" value={`${WATER_QUALITY.dissolvedOxygen} mg/L`} sub="healthy" />
        <StatCard icon={Eye} label="Turbidity" value={`${WATER_QUALITY.turbidity} NTU`} sub="clear" />
        <StatCard icon={Sun} label="Temperature" value={`${WATER_QUALITY.temperature}°F`} sub="seasonal avg" />
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-emerald-400 font-semibold flex items-center gap-2">
            <Droplets className="w-4 h-4" /> Water Quality Index
          </h4>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            WATER_QUALITY.rating === 'Good' ? 'bg-emerald-500/20 text-emerald-400' :
            WATER_QUALITY.rating === 'Fair' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {WATER_QUALITY.rating}
          </span>
        </div>
        
        <div className="space-y-3">
          {[
            { label: 'Secchi Depth (Clarity)', value: WATER_QUALITY.secchiDepth, max: 15, unit: 'ft' },
            { label: 'Chlorophyll-a', value: WATER_QUALITY.chlorophyll, max: 20, unit: 'µg/L' },
            { label: 'Conductivity', value: WATER_QUALITY.conductivity, max: 500, unit: 'µS/cm' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{item.label}</span>
                <span className="text-slate-400 font-mono">{item.value} {item.unit}</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 rounded-full"
                  style={{ width: `${(item.value / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" /> Storage Status
        </h4>
        <div className="relative">
          <div className="h-24 bg-slate-900 rounded-lg overflow-hidden relative">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500"
              style={{ height: '97%' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white drop-shadow-lg">96.98%</span>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>Conservation Pool</span>
            <span className="font-mono">260,840 / 268,875 ac-ft</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3">Monthly Trends</h4>
        <div className="h-32 bg-slate-900 rounded p-2">
          <svg viewBox="0 0 300 100" className="w-full h-full">
            {/* Temperature line */}
            <path 
              d="M 20,80 L 45,75 L 70,65 L 95,50 L 120,40 L 145,35 L 170,35 L 195,40 L 220,50 L 245,65 L 270,75 L 295,80" 
              fill="none" 
              stroke="#f97316" 
              strokeWidth="2"
            />
            
            {/* Water level line */}
            <path 
              d="M 20,45 L 45,48 L 70,50 L 95,48 L 120,42 L 145,38 L 170,40 L 195,45 L 220,48 L 245,46 L 270,44 L 295,45" 
              fill="none" 
              stroke="#06b6d4" 
              strokeWidth="2"
            />
            
            {/* Legend */}
            <circle cx="230" cy="10" r="3" fill="#f97316" />
            <text x="238" y="13" fill="#94a3b8" fontSize="8">Temp</text>
            <circle cx="270" cy="10" r="3" fill="#06b6d4" />
            <text x="278" y="13" fill="#94a3b8" fontSize="8">Level</text>
            
            {/* Month labels */}
            <text x="20" y="98" fill="#64748b" fontSize="7">J</text>
            <text x="70" y="98" fill="#64748b" fontSize="7">M</text>
            <text x="120" y="98" fill="#64748b" fontSize="7">M</text>
            <text x="170" y="98" fill="#64748b" fontSize="7">J</text>
            <text x="220" y="98" fill="#64748b" fontSize="7">S</text>
            <text x="270" y="98" fill="#64748b" fontSize="7">N</text>
          </svg>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Fish className="w-4 h-4" /> Fish & Wildlife
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            'Largemouth Bass', 'Channel Catfish', 'Blue Catfish', 
            'Crappie', 'Bluegill', 'Threadfin Shad'
          ].map((fish) => (
            <div key={fish} className="flex items-center gap-2 text-slate-300">
              <Fish className="w-3 h-3 text-cyan-400" />
              {fish}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Ruler className="w-4 h-4" /> Measurement Tools
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => setAnalysisMode(analysisMode === 'distance' ? null : 'distance')}
            className={`p-3 rounded text-sm font-medium transition-all flex items-center gap-2 justify-center ${
              analysisMode === 'distance' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Ruler className="w-4 h-4" /> Distance
          </button>
          <button 
            onClick={() => setAnalysisMode(analysisMode === 'area' ? null : 'area')}
            className={`p-3 rounded text-sm font-medium transition-all flex items-center gap-2 justify-center ${
              analysisMode === 'area' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Area
          </button>
          <button 
            onClick={() => setAnalysisMode(analysisMode === 'elevation' ? null : 'elevation')}
            className={`p-3 rounded text-sm font-medium transition-all flex items-center gap-2 justify-center ${
              analysisMode === 'elevation' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Mountain className="w-4 h-4" /> Profile
          </button>
          <button 
            onClick={() => setAnalysisMode(analysisMode === 'viewshed' ? null : 'viewshed')}
            className={`p-3 rounded text-sm font-medium transition-all flex items-center gap-2 justify-center ${
              analysisMode === 'viewshed' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Eye className="w-4 h-4" /> Viewshed
          </button>
        </div>
        {analysisMode && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-sm text-emerald-400">
            Click on map to begin {analysisMode} analysis
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Quick Calculations
        </h4>
        <div className="space-y-3">
          <div className="p-3 bg-slate-900 rounded">
            <div className="text-slate-400 text-xs mb-1">Shoreline per Acre</div>
            <div className="text-xl text-slate-200 font-mono">
              {(SARDIS_LAKE_DATA.shorelineLength * 5280 / SARDIS_LAKE_DATA.surfaceArea).toFixed(1)} ft/ac
            </div>
          </div>
          <div className="p-3 bg-slate-900 rounded">
            <div className="text-slate-400 text-xs mb-1">Average Depth</div>
            <div className="text-xl text-slate-200 font-mono">
              {(SARDIS_LAKE_DATA.volume / SARDIS_LAKE_DATA.surfaceArea).toFixed(1)} ft
            </div>
          </div>
          <div className="p-3 bg-slate-900 rounded">
            <div className="text-slate-400 text-xs mb-1">Runoff to Storage Ratio</div>
            <div className="text-xl text-slate-200 font-mono">
              {(SARDIS_LAKE_DATA.drainageArea / (SARDIS_LAKE_DATA.volume / 1000)).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Options
        </h4>
        <div className="space-y-2">
          <button className="w-full p-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 flex items-center gap-2 justify-center transition-colors">
            <FileText className="w-4 h-4" /> Export Report (PDF)
          </button>
          <button className="w-full p-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 flex items-center gap-2 justify-center transition-colors">
            <Database className="w-4 h-4" /> Export Data (CSV)
          </button>
          <button className="w-full p-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 flex items-center gap-2 justify-center transition-colors">
            <Map className="w-4 h-4" /> Export Map (GeoJSON)
          </button>
          <button className="w-full p-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 flex items-center gap-2 justify-center transition-colors">
            <Camera className="w-4 h-4" /> Screenshot Map
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Share & Collaborate
        </h4>
        <div className="space-y-2">
          <button className="w-full p-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 flex items-center gap-2 justify-center transition-colors">
            <Share2 className="w-4 h-4" /> Generate Share Link
          </button>
          <button className="w-full p-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 flex items-center gap-2 justify-center transition-colors">
            <Bookmark className="w-4 h-4" /> Save Current View
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f14] text-slate-200 font-['JetBrains_Mono',_'SF_Mono',_monospace]">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-md border-b border-emerald-500/20 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-emerald-400 tracking-tight">LakeScope</h1>
              <p className="text-xs text-slate-500">Environmental Analysis Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-64"
              />
            </div>
            <button className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 transition-colors">
              <Settings className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Controls */}
        <aside className="w-80 bg-slate-900/50 border-r border-slate-800 overflow-y-auto">
          <div className="p-4">
            {/* Lake Selector */}
            <div className="mb-4 p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{SARDIS_LAKE_DATA.name}</span>
              </div>
              <div className="text-xs text-slate-400">
                {SARDIS_LAKE_DATA.county} County, {SARDIS_LAKE_DATA.state}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'elevation' && renderElevation()}
              {activeTab === 'economic' && renderEconomic()}
              {activeTab === 'planning' && renderPlanning()}
              {activeTab === 'water' && renderWater()}
              {activeTab === 'analysis' && renderAnalysis()}
            </div>
          </div>
        </aside>

        {/* Main Map Area */}
        <main className="flex-1 relative bg-[#0f1419]">
          {/* Map Canvas */}
          <canvas 
            ref={canvasRef} 
            width={900} 
            height={700}
            className="w-full h-full"
            style={{ cursor: analysisMode ? 'crosshair' : 'grab' }}
          />

          {/* Map Controls Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg overflow-hidden">
              <button className="p-2 hover:bg-slate-800 transition-colors block">
                <Plus className="w-5 h-5 text-slate-400" />
              </button>
              <div className="border-t border-slate-700" />
              <button className="p-2 hover:bg-slate-800 transition-colors block">
                <Minus className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <button className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-2 hover:bg-slate-800 transition-colors">
              <Crosshair className="w-5 h-5 text-slate-400" />
            </button>
            <button className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-2 hover:bg-slate-800 transition-colors">
              <Maximize2 className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Layer Toggle */}
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2 font-medium">Map Layers</div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showContours} 
                  onChange={() => setShowContours(!showContours)}
                  className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
                />
                <span className="text-sm text-slate-300">Elevation Contours</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showZones} 
                  onChange={() => setShowZones(!showZones)}
                  className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
                />
                <span className="text-sm text-slate-300">Land Use Zones</span>
              </label>
            </div>
          </div>

          {/* Current Elevation Info */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-400">Current Status</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500 text-xs">Pool Elevation</div>
                <div className="text-cyan-400 font-mono">598.42 ft</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">% Capacity</div>
                <div className="text-emerald-400 font-mono">96.98%</div>
              </div>
            </div>
          </div>

          {/* Contour Legend */}
          {showContours && (
            <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-2 font-medium">Depth Legend</div>
              <div className="space-y-1">
                {ELEVATION_CONTOURS.slice(0, 7).map((c) => (
                  <div key={c.elevation} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-slate-400">{c.depth > 0 ? `${c.depth}ft` : 'Surface'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Mode Indicator */}
          {analysisMode && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="bg-emerald-500/20 border border-emerald-500 rounded-lg px-4 py-2 text-emerald-400 text-sm animate-pulse">
                {analysisMode.charAt(0).toUpperCase() + analysisMode.slice(1)} Mode Active
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, sub, highlight }) {
  return (
    <div className={`p-3 rounded-lg border transition-all ${
      highlight 
        ? 'bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30' 
        : 'bg-slate-800/50 border-slate-700'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${highlight ? 'text-emerald-400' : 'text-slate-500'}`} />
        <span className="text-slate-400 text-xs">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${highlight ? 'text-emerald-400' : 'text-slate-200'}`}>
        {value}
      </div>
      {sub && <div className="text-slate-500 text-xs">{sub}</div>}
    </div>
  );
}
