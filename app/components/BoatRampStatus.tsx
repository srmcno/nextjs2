'use client';

import { useMemo } from 'react';
import {
  Anchor, CheckCircle, XCircle, AlertTriangle,
  Car, Navigation, Phone, MapPin
} from 'lucide-react';

interface BoatRamp {
  id: string;
  name: string;
  location: string;
  minElevation: number; // Minimum water elevation for ramp access
  optimalElevation: number; // Optimal water elevation
  coordinates: { lat: number; lng: number };
  amenities: string[];
  parkingSpaces: number;
  phone?: string;
}

interface BoatRampStatusProps {
  currentElevation: number;
  normalPoolElevation: number;
}

// Sardis Lake boat ramps data
const BOAT_RAMPS: BoatRamp[] = [
  {
    id: 'potato-hills',
    name: 'Potato Hills North',
    location: 'North Shore',
    minElevation: 590,
    optimalElevation: 595,
    coordinates: { lat: 34.6850, lng: -95.3750 },
    amenities: ['Parking', 'Restrooms', 'Fish Cleaning Station', 'Camping'],
    parkingSpaces: 75,
    phone: '(918) 567-2523',
  },
  {
    id: 'potato-hills-south',
    name: 'Potato Hills South',
    location: 'South Shore',
    minElevation: 588,
    optimalElevation: 594,
    coordinates: { lat: 34.6720, lng: -95.3680 },
    amenities: ['Parking', 'Restrooms', 'Picnic Area'],
    parkingSpaces: 50,
  },
  {
    id: 'sardis-cove',
    name: 'Sardis Cove Marina',
    location: 'East Shore',
    minElevation: 585,
    optimalElevation: 592,
    coordinates: { lat: 34.6550, lng: -95.3550 },
    amenities: ['Full Service Marina', 'Fuel Dock', 'Boat Rental', 'Store', 'Restaurant'],
    parkingSpaces: 120,
    phone: '(918) 567-2323',
  },
  {
    id: 'billy-creek',
    name: 'Billy Creek',
    location: 'West Shore',
    minElevation: 592,
    optimalElevation: 597,
    coordinates: { lat: 34.6480, lng: -95.4100 },
    amenities: ['Parking', 'Restrooms', 'Primitive Camping'],
    parkingSpaces: 35,
  },
  {
    id: 'jackfork',
    name: 'Jackfork Creek',
    location: 'Northwest Arm',
    minElevation: 594,
    optimalElevation: 598,
    coordinates: { lat: 34.6900, lng: -95.4200 },
    amenities: ['Parking', 'Hiking Trails'],
    parkingSpaces: 25,
  },
];

type RampStatus = 'open' | 'limited' | 'closed';

function getRampStatus(ramp: BoatRamp, currentElevation: number): {
  status: RampStatus;
  message: string;
  launchable: string[];
} {
  const diff = currentElevation - ramp.minElevation;

  if (currentElevation >= ramp.optimalElevation) {
    return {
      status: 'open',
      message: 'Fully operational - optimal conditions',
      launchable: ['All vessels', 'Large boats', 'Pontoons', 'PWC'],
    };
  } else if (currentElevation >= ramp.minElevation + 3) {
    return {
      status: 'open',
      message: 'Accessible - good conditions',
      launchable: ['Most boats', 'Medium vessels', 'PWC'],
    };
  } else if (currentElevation >= ramp.minElevation) {
    return {
      status: 'limited',
      message: `Limited access - ${diff.toFixed(1)} ft above minimum`,
      launchable: ['Small boats', 'Kayaks', 'Canoes', 'PWC'],
    };
  } else {
    return {
      status: 'closed',
      message: `Closed - water ${Math.abs(diff).toFixed(1)} ft below minimum`,
      launchable: [],
    };
  }
}

export default function BoatRampStatus({
  currentElevation,
  normalPoolElevation,
}: BoatRampStatusProps) {
  const rampStatuses = useMemo(() => {
    return BOAT_RAMPS.map(ramp => ({
      ...ramp,
      ...getRampStatus(ramp, currentElevation),
    }));
  }, [currentElevation]);

  const openCount = rampStatuses.filter(r => r.status === 'open').length;
  const limitedCount = rampStatuses.filter(r => r.status === 'limited').length;
  const closedCount = rampStatuses.filter(r => r.status === 'closed').length;

  const StatusIcon = ({ status }: { status: RampStatus }) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'limited':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'closed':
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const statusBg = (status: RampStatus) => {
    switch (status) {
      case 'open':
        return 'bg-emerald-500/10 border-emerald-500/30';
      case 'limited':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'closed':
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-emerald-400 font-semibold flex items-center gap-2">
            <Anchor className="w-4 h-4" /> Boat Ramp Status
          </h4>
          <div className="text-xs text-slate-400">
            @ {currentElevation.toFixed(1)} ft
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
            <div className="text-lg font-bold text-emerald-400">{openCount}</div>
            <div className="text-xs text-slate-400">Open</div>
          </div>
          <div className="text-center p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
            <div className="text-lg font-bold text-yellow-400">{limitedCount}</div>
            <div className="text-xs text-slate-400">Limited</div>
          </div>
          <div className="text-center p-2 bg-red-500/10 rounded border border-red-500/20">
            <div className="text-lg font-bold text-red-400">{closedCount}</div>
            <div className="text-xs text-slate-400">Closed</div>
          </div>
        </div>

        {/* Ramp List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {rampStatuses.map(ramp => (
            <div
              key={ramp.id}
              className={`p-3 rounded-lg border transition-all ${statusBg(ramp.status)}`}
            >
              <div className="flex items-start gap-3">
                <StatusIcon status={ramp.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-slate-200 font-medium text-sm truncate">
                      {ramp.name}
                    </h5>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      ramp.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                      ramp.status === 'limited' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {ramp.status.charAt(0).toUpperCase() + ramp.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span className="text-xs text-slate-400">{ramp.location}</span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">{ramp.message}</p>

                  {/* Launchable vessels */}
                  {ramp.launchable.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ramp.launchable.map((vessel, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-300"
                        >
                          {vessel}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Amenities */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {ramp.parkingSpaces} spots
                    </span>
                    {ramp.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {ramp.phone}
                      </span>
                    )}
                  </div>

                  {/* Amenity icons */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ramp.amenities.slice(0, 4).map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-1.5 py-0.5 bg-slate-900/50 rounded text-slate-500"
                      >
                        {amenity}
                      </span>
                    ))}
                    {ramp.amenities.length > 4 && (
                      <span className="text-xs px-1.5 py-0.5 bg-slate-900/50 rounded text-slate-500">
                        +{ramp.amenities.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Water Level Context */}
        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Current vs Normal Pool:</span>
            <span className={`font-mono ${
              currentElevation >= normalPoolElevation ? 'text-emerald-400' :
              currentElevation >= normalPoolElevation - 3 ? 'text-yellow-400' :
              'text-orange-400'
            }`}>
              {currentElevation >= normalPoolElevation ? '+' : ''}
              {(currentElevation - normalPoolElevation).toFixed(1)} ft
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all rounded-full ${
                currentElevation >= normalPoolElevation ? 'bg-emerald-500' :
                currentElevation >= normalPoolElevation - 3 ? 'bg-yellow-500' :
                'bg-orange-500'
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, ((currentElevation - 585) / (normalPoolElevation - 585)) * 100))}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>585 ft</span>
            <span>{normalPoolElevation} ft (normal)</span>
          </div>
        </div>
      </div>

      {/* Low Water Advisory */}
      {currentElevation < normalPoolElevation - 5 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Low Water Advisory
          </div>
          <p className="text-orange-300/80 text-xs mt-1">
            Water levels are {(normalPoolElevation - currentElevation).toFixed(1)} ft below normal.
            Some ramps may have limited access. Check conditions before trailering large vessels.
          </p>
        </div>
      )}
    </div>
  );
}
