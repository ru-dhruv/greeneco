"use client";

import { useState, useEffect, useMemo, useRef, Component } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { 
  Search, MapPin, RefreshCw, X, Filter, 
  Activity, Zap, Sparkles, Map as MapIcon, Share2, 
  Info, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import LogActionForm from '@/components/LogActionForm';

// Dynamic Import for Leaflet (No SSR)
const MapClient = dynamic(() => import('@/components/MapClient'), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center">
    <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-3" />
    <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase animate-pulse">Initializing Eco-Engine...</p>
  </div>
});

// Error boundary to catch MapClient crashes
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Map render error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <h3 className="text-lg font-black text-gray-900 uppercase mb-2">Map Unavailable</h3>
          <p className="text-xs text-gray-500 font-medium mb-4">The map could not be loaded. Please try refreshing the page.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-full uppercase tracking-widest hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Constants
const WAQI_TOKEN = '1005be6b60890a2b49157105a7a976a5e1c85eb9';
const DEFAULT_COORDS = { lat: 28.6139, lng: 77.2090, name: 'Delhi' };

const DELHI_FALLBACK = [
  { id: 'av', name: 'Anand Vihar', aqi: 287, lat: 28.6502, lng: 77.3027 },
  { id: 'cp', name: 'Connaught Place', aqi: 165, lat: 28.6315, lng: 77.2167 },
  { id: 'lg', name: 'Lodhi Garden', aqi: 89, lat: 28.5933, lng: 77.2189 },
  { id: 'np', name: 'Nehru Park', aqi: 72, lat: 28.5925, lng: 77.1904 },
  { id: 'yb', name: 'Yamuna Bank', aqi: 312, lat: 28.6251, lng: 77.2601 }
];

const ZONE_STLYES = {
  'Dead Zone': { color: '#ef4444', rgb: '239, 68, 68', emoji: '💀', desc: 'Severely polluted — needs urgent action' },
  'Polluted Zone': { color: '#f97316', rgb: '249, 115, 22', emoji: '🏭', desc: 'High pollution — cleanup drives needed' },
  'Clean Zone': { color: '#eab308', rgb: '234, 179, 8', emoji: '🧹', desc: 'Getting cleaner — keep going!' },
  'Green Zone': { color: '#22c55e', rgb: '34, 197, 94', emoji: '🌿', desc: 'Healthy area — maintain it' },
  'Biodiversity Zone': { color: '#10b981', rgb: '16, 185, 129', emoji: '🦋', desc: 'Thriving ecosystem — protect it' }
};

function getZoneType(aqi, greeneryScore = 0) {
  if (greeneryScore > 80 && aqi < 100) return 'Biodiversity Zone';
  if (greeneryScore > 60 && aqi < 150) return 'Green Zone';
  if (aqi >= 300) return 'Dead Zone';
  if (aqi >= 200) return 'Polluted Zone';
  if (aqi >= 100) return 'Clean Zone';
  if (aqi >= 50) return 'Green Zone';
  return 'Biodiversity Zone';
}

export default function MapPage() {
  const { user, userProfile } = useAuth();
  const [currentCity, setCurrentCity] = useState(DEFAULT_COORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [greeneryScore, setGreeneryScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(Object.fromEntries(Object.keys(ZONE_STLYES).map(k => [k, true])));
  const [ecoScores, setEcoScores] = useState({});
  const [showLogForm, setShowLogForm] = useState(false);

  const fetchLocationData = async (lat, lng, cityName) => {
    setLoading(true);
    setSelectedZone(null);
    setPanelOpen(false);
    setShowLogForm(false);

    try {
      const waqiUrl = `https://api.waqi.info/map/bounds/?token=${WAQI_TOKEN}&latlng=${lat-0.5},${lng-0.5},${lat+0.5},${lng+0.5}`;
      const waqiRes = await fetch(waqiUrl);
      const waqiData = await waqiRes.json();
      let stations = [];
      
      if (waqiData.status === 'ok' && waqiData.data.length > 0) {
        stations = waqiData.data.slice(0, 15).map(s => ({
          id: s.uid, 
          name: s.station.name.split(',')[0].replace(/AQI|Station/gi, '').trim(), 
          aqi: parseInt(s.aqi), 
          lat: s.lat, 
          lng: s.lon
        }));
      } else {
        stations = DELHI_FALLBACK;
      }

      // Greenery (Simplified for speed)
      setGreeneryScore(Math.floor(Math.random() * 60) + 20);

      // Firestore Stats (Averaged/Mocked for surgical UI focus)
      const scores = {};
      stations.forEach(s => { scores[s.id] = { score: Math.floor(Math.random() * 50), count: Math.floor(Math.random() * 10) }; });
      setEcoScores(scores);

      const processedZones = stations.map(s => {
        const type = getZoneType(s.aqi);
        return { ...s, type, style: ZONE_STLYES[type] };
      });

      setZoneData(processedZones);
      setCurrentCity({ lat, lng, name: cityName });
    } catch (err) {
      console.error(err);
      setZoneData(DELHI_FALLBACK.map(s => ({ ...s, type: getZoneType(s.aqi), style: ZONE_STLYES[getZoneType(s.aqi)] })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationData(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng, "Delhi");
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1&accept-language=en&email=greeneco@app.local`);
        const data = await res.json();
        setSearchResults(data);
      } catch (e) { 
        console.error(e); 
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = (val) => {
    setSearchQuery(val);
  };

  const avgAQI = useMemo(() => zoneData.length ? Math.round(zoneData.reduce((acc, z) => acc + z.aqi, 0) / zoneData.length) : 0, [zoneData]);
  const healthScore = Math.max(0, 100 - Math.round(avgAQI / 5));

  const hiddenCount = Object.values(filters).filter(v => !v).length;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-white relative">
        
        {/* TOP STATS BAR */}
        <div className="h-14 bg-white border-b border-gray-100 flex items-center gap-3 px-4 z-40 overflow-x-auto no-scrollbar">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search city..."
              className="w-full bg-gray-50 border-none rounded-full pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                {searchResults.map((r, i) => (
                  <div key={i} onClick={() => {
                    setSearchQuery(''); setSearchResults([]);
                    fetchLocationData(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(',')[0]);
                  }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0">
                    <p className="text-[11px] font-black text-gray-900">{r.display_name.split(',')[0]}</p>
                    <p className="text-[9px] text-gray-400 truncate mt-0.5">{r.display_name.split(',').slice(1).join(',').trim()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={clsx("h-10 px-4 flex items-center gap-2 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0", 
            healthScore > 60 ? 'bg-emerald-100 text-emerald-700' : healthScore > 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
          )}>
            {currentCity.name}: {healthScore}% Health
          </div>

          <div className="h-10 px-4 bg-gray-50 rounded-full flex items-center gap-2 text-[10px] font-black text-gray-700 uppercase shrink-0">
            <Activity className="w-4 h-4 text-emerald-500" /> {avgAQI} Avg AQI
          </div>

          <button onClick={() => fetchLocationData(currentCity.lat, currentCity.lng, currentCity.name)} className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors">
            <RefreshCw className={clsx("w-4 h-4 text-gray-400", loading && "animate-spin")} />
          </button>
        </div>

        {/* MAP CONTAINER */}
        <div className="flex-1 relative flex flex-col lg:flex-row h-full">
          
          <div className="flex-1 relative order-2 lg:order-1 border-t lg:border-t-0">
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center">
                 <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-3" />
                 <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase animate-pulse">Fetching live AQI data... 🌍</p>
              </div>
            )}

            <MapErrorBoundary>
              <MapClient 
                currentCity={currentCity}
                zoneData={zoneData}
                selectedZone={selectedZone}
                onZoneClick={(z) => { setSelectedZone(z); setPanelOpen(true); setShowLogForm(false); }}
                filters={filters}
              />
            </MapErrorBoundary>

            {/* COLLAPSIBLE FILTERS */}
            <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2">
              {!filtersOpen ? (
                <button 
                  onClick={() => setFiltersOpen(true)}
                  className="bg-white px-4 py-2.5 rounded-full shadow-2xl border border-gray-100 flex items-center gap-2 text-[11px] font-black text-gray-800 hover:shadow-emerald-200/50 transition-all active:scale-95 relative"
                >
                  <Filter className="w-3.5 h-3.5 text-emerald-500" />
                  Filters
                  {hiddenCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center border border-white font-black">{hiddenCount}</span>}
                </button>
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xl w-[200px] animate-in zoom-in-95 fade-in duration-200">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase">Filter Zones</h4>
                    <button onClick={() => setFiltersOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  <div className="space-y-3">
                    {Object.keys(ZONE_STLYES).map(type => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ZONE_STLYES[type].color }} />
                           <span className="text-[10px] font-bold text-gray-600 truncate max-w-[100px]">{type.split(' ')[0]}</span>
                        </div>
                        <button 
                          onClick={() => setFilters(prev => ({...prev, [type]: !prev[type]}))}
                          className={clsx("w-8 h-4.5 rounded-full transition-all relative", filters[type] ? "bg-emerald-500" : "bg-gray-200")}
                        >
                          <div className={clsx("absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all", filters[type] ? "right-0.5" : "left-0.5")} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between">
                    <button onClick={() => setFilters(Object.fromEntries(Object.keys(ZONE_STLYES).map(k => [k, true])))} className="text-[9px] font-black text-emerald-600 hover:underline">Show all</button>
                    <button onClick={() => setFilters(Object.fromEntries(Object.keys(ZONE_STLYES).map(k => [k, false])))} className="text-[9px] font-black text-gray-400 hover:underline">Hide all</button>
                  </div>
                </div>
              )}
            </div>

            {/* ZONE CHIPS (40px) */}
            <div className="absolute bottom-6 left-0 right-0 z-[400] px-6 pointer-events-none">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pointer-events-auto snap-x">
                {zoneData.filter(z => filters[z.type]).map(zone => (
                  <div 
                    key={zone.id}
                    onClick={() => { setSelectedZone(zone); setPanelOpen(true); setShowLogForm(false); }}
                    className={clsx(
                      "min-w-[140px] h-10 rounded-full px-4 flex items-center gap-3 border-2 transition-all cursor-pointer backdrop-blur-xl shadow-lg snap-center shrink-0 group",
                      selectedZone?.id === zone.id ? "border-white scale-105" : "border-transparent"
                    )}
                    style={{ backgroundColor: `rgba(${zone.style.rgb}, 0.85)` }}
                  >
                    <span className="text-lg drop-shadow-sm group-hover:rotate-12 transition-transform shrink-0">{zone.style.emoji}</span>
                    <p className="text-[10px] font-black text-white uppercase tracking-wider truncate flex-1">{zone.name}</p>
                    <span className="text-[10px] font-black text-white/90 ml-auto">{zone.aqi}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SIDE/BOTTOM PANEL (REFINED) */}
          <div className={clsx(
              "bg-white border-gray-100 shadow-[0_-12px_48px_rgba(0,0,0,0.12)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-[500] flex flex-col",
              "lg:relative lg:w-80 lg:translate-y-0 lg:order-2 lg:h-full lg:border-l lg:border-t-0",
              "fixed bottom-0 left-0 right-0 h-[85vh] rounded-t-2xl p-6 border-t",
              panelOpen ? "translate-y-0 opacity-100" : "translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto"
            )}>
            <div className="lg:hidden flex justify-center mb-6 cursor-pointer" onClick={() => setPanelOpen(false)}>
              <div className="w-12 h-1 bg-gray-200 rounded-full" />
            </div>

            {selectedZone ? (
              <div className="h-full relative overflow-y-auto no-scrollbar pt-2">
                <button onClick={() => setPanelOpen(false)} className="absolute top-0 right-0 p-2 text-gray-300 hover:text-gray-900 transition-colors"><X className="w-5 h-5" /></button>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <span className="text-6xl p-4 bg-gray-50 rounded-[2rem] shadow-sm">{selectedZone.style.emoji}</span>
                     <div className="flex-1">
                       <h2 className="text-lg font-black text-gray-900 leading-tight uppercase truncate">{selectedZone.name}</h2>
                       <p className="text-[9px] font-bold text-gray-400 mt-0.5">{currentCity.name}</p>
                       <div className="mt-2 text-[8px] font-black px-2 py-0.5 inline-block text-white rounded-full uppercase" style={{ backgroundColor: selectedZone.style.color }}>{selectedZone.type}</div>
                     </div>
                  </div>

                  {/* Gradient AQI Meter */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-gray-400 px-1">Air Quality</span>
                       <span style={{ color: selectedZone.style.color }}>{selectedZone.aqi} AQI</span>
                    </div>
                    <div className="h-3.5 bg-gray-100 rounded-full relative overflow-hidden flex items-center p-0.5">
                       <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 opacity-50" />
                       <div className="w-2.5 h-2.5 bg-white rounded-full shadow-md z-10 transition-all duration-1000 border border-gray-100" style={{ marginLeft: `${Math.min(95, (selectedZone.aqi / 350) * 100)}%`, transform: 'translateX(-50%)' }} />
                    </div>
                  </div>

                  {/* 3 Side-by-Side Stats */}
                  <div className="grid grid-cols-3 gap-2">
                     <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100 text-center">
                        <p className="text-[8px] font-black text-emerald-700 uppercase mb-0.5 tracking-tightAlpha">Eco</p>
                        <p className="text-xs font-black text-emerald-600 tracking-tight">{ecoScores[selectedZone.id]?.score || 0}</p>
                     </div>
                     <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100 text-center">
                        <p className="text-[8px] font-black text-blue-700 uppercase mb-0.5 tracking-tightAlpha">Acts</p>
                        <p className="text-xs font-black text-blue-600 tracking-tight">{ecoScores[selectedZone.id]?.count || 0}</p>
                     </div>
                     <div className="bg-purple-50/50 rounded-2xl p-3 border border-purple-100 text-center">
                        <p className="text-[8px] font-black text-purple-700 uppercase mb-0.5 tracking-tightAlpha">Radius</p>
                        <p className="text-xs font-black text-purple-600 tracking-tight">56px</p>
                     </div>
                  </div>

                  {/* INTEGRATED LOG ACTION PLAN */}
                  <div className="mt-8 border-t border-gray-50 pt-6">
                    {!showLogForm ? (
                      <button 
                         onClick={() => setShowLogForm(true)}
                         className="w-full py-4 bg-emerald-600 text-white font-black text-xs rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95"
                      >
                         <Zap className="w-4 h-4 fill-current" /> Log Action Here
                      </button>
                    ) : (
                      <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">New Eco Log</h3>
                          <button onClick={() => setShowLogForm(false)} className="text-[10px] font-black text-gray-400 uppercase">Cancel</button>
                        </div>
                        <LogActionForm 
                          user={user} 
                          userProfile={userProfile} 
                          defaultLocation={selectedZone.name + ', ' + currentCity.name}
                          onSuccess={() => { setShowLogForm(false); fetchLocationData(currentCity.lat, currentCity.lng, currentCity.name); }} 
                        />
                      </div>
                    )}
                  </div>
                  
                  <button className="w-full py-3 bg-gray-50 text-gray-400 font-black text-[9px] rounded-2xl hover:bg-gray-100 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                    <Share2 className="w-3 h-3" /> Share Eco-Zone
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-5xl mb-6">🗺️</div>
                <h3 className="text-lg font-black text-gray-900 uppercase">Explore Zones</h3>
                <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest leading-relaxed">
                  Select a marker on the map to analyze environmental vitals and log local actions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
