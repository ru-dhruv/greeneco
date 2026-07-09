"use client";

import { useEffect, useState } from 'react';

// Guard: Only render on client
function MapClientInner({ currentCity, zoneData, selectedZone, onZoneClick, filters }) {
  const [leafletReady, setLeafletReady] = useState(false);
  const [LeafletModules, setLeafletModules] = useState(null);

  useEffect(() => {
    // Dynamically import leaflet and react-leaflet only on the client
    let cancelled = false;
    async function loadLeaflet() {
      try {
        // Import CSS
        await import('leaflet/dist/leaflet.css');

        const L = (await import('leaflet')).default;
        const RL = await import('react-leaflet');

        if (!cancelled) {
          setLeafletModules({ L, ...RL });
          setLeafletReady(true);
        }
      } catch (err) {
        console.error('Failed to load Leaflet:', err);
      }
    }
    loadLeaflet();
    return () => { cancelled = true; };
  }, []);

  if (!leafletReady || !LeafletModules) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-3" />
        <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase animate-pulse">Loading Map...</p>
      </div>
    );
  }

  const { L, MapContainer, TileLayer, Marker, ZoomControl, Tooltip } = LeafletModules;

  // ChangeView component using useMap from the loaded modules
  function ChangeView({ center, zoom }) {
    const map = LeafletModules.useMap();
    useEffect(() => {
      map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
  }

  const createCustomIcon = (emoji, color, isSelected) => {
    try {
      return L.divIcon({
        html: `
          <div style="
            width: 56px; 
            height: 56px; 
            background-color: ${color}; 
            border-radius: 50%; 
            border: 2px solid white; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 24px;
            transition: all 0.2s ease;
            ${isSelected ? 'transform: scale(1.15); border: 3px solid white; box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 1000;' : ''}
          ">
            ${emoji}
          </div>
        `,
        className: '',
        iconSize: [56, 56],
        iconAnchor: [28, 28],
      });
    } catch (err) {
      console.error('Failed to create map icon:', err);
      return L.divIcon({
        html: `<div style="width:56px;height:56px;background:${color};border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;">📍</div>`,
        className: '',
        iconSize: [56, 56],
        iconAnchor: [28, 28],
      });
    }
  };

  const center = [currentCity.lat, currentCity.lng];
  const zoom = selectedZone ? 14 : 12;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <ChangeView center={center} zoom={zoom} />
        
        {zoneData.filter(z => filters[z.type]).map((zone) => (
          <Marker 
            key={zone.id} 
            position={[zone.lat, zone.lng]}
            icon={createCustomIcon(zone.style.emoji, zone.style.color, selectedZone?.id === zone.id)}
            eventHandlers={{
              click: () => onZoneClick(zone)
            }}
          >
            <Tooltip direction="top" offset={[0, -32]} opacity={1} permanent={false}>
              <div className="bg-gray-900 text-white p-2 rounded-lg shadow-xl border border-white/10 min-w-[120px]">
                <p className="text-[10px] font-black uppercase text-emerald-400 mb-0.5">{zone.name}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-300">{zone.type}</span>
                  <span className="text-sm font-black text-white">{zone.aqi}</span>
                </div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default function MapClient(props) {
  const [hasError, setHasError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server
  if (typeof window === 'undefined' || !mounted) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-3" />
        <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase animate-pulse">Initializing Map...</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <h3 className="text-lg font-black text-gray-900 uppercase mb-2">Map Unavailable</h3>
        <p className="text-xs text-gray-500 font-medium mb-4">The map could not be loaded. Please try refreshing the page.</p>
        <button 
          onClick={() => { setHasError(false); }}
          className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-full uppercase tracking-widest hover:bg-emerald-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundaryWrapper onError={() => setHasError(true)}>
      <MapClientInner {...props} />
    </ErrorBoundaryWrapper>
  );
}

// Simple error boundary using class component
import { Component } from 'react';

class ErrorBoundaryWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map Error Boundary caught:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return null; // Parent handles fallback UI
    }
    return this.props.children;
  }
}
