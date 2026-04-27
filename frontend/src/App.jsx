import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InputForm, { EXAMPLES } from './components/InputForm';
import MapDisplay from './components/MapDisplay';
import EldLogbook from './components/EldLogbook';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const App = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [unit, setUnit]       = useState('miles'); // 'miles' or 'km'

  // Trigger initial calculation on mount to show immediate results
  useEffect(() => {
    handleCalculate({ ...EXAMPLES });
  }, []);

  // Re-calculate when unit changes to update fuel stops and thresholds
  useEffect(() => {
    if (data) {
      // We could re-calculate here, but usually miles->km is just a display change
      // However, HOS fuel stops depend on units, so a re-fetch is safer for accuracy.
      // For now, let's just let the user click calculate if they change units, 
      // or we can auto-trigger if we have the last formData.
    }
  }, [unit]);

  const handleCalculate = async (formData) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/routing/calculate-route/`,
        { ...formData, unit }
      );
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const totalDays = data
    ? Math.ceil(data.hos_events[data.hos_events.length - 1]?.end_time / 1440)
    : 0;

  const unitLabel = unit === 'miles' ? 'mi' : 'km';
  const distVal = data ? (unit === 'miles' ? data.total_distance_miles : data.total_distance_miles * 1.60934) : 0;

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500/30" style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)' }}>
      {/* Header */}
      <header className="relative py-12 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #3b82f6 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase">Spotter <span className="text-blue-500">HOS</span></h1>
          </div>
          <p className="text-slate-400 text-lg font-medium max-w-2xl mx-auto">
            FMCSA-Compliant ELD Engine for Property Carriers
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Active Rule: 70hr / 8-Day
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-20 flex flex-col gap-10">

        {/* Global Controls */}
        <div className="flex justify-end items-center gap-4 px-2">
           <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700 shadow-inner">
              <button 
                onClick={() => setUnit('miles')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider transition-all ${unit === 'miles' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >MILES</button>
              <button 
                onClick={() => setUnit('km')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider transition-all ${unit === 'km' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >KM</button>
           </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-2xl flex items-start gap-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <svg className="w-6 h-6 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-bold text-white">Calculation Error</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Input + Summary row */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-4">
            <InputForm onSubmit={handleCalculate} isLoading={loading} />
          </div>

          <div className="xl:col-span-8 flex flex-col gap-8">
            {data ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Distance',    value: `${distVal.toFixed(1)} ${unitLabel}`,   icon: '🛣️' },
                    { label: 'Driving Time',      value: `${(data.total_duration_minutes / 60).toFixed(1)} hrs`, icon: '⏱️' },
                    { label: 'Total Log Days',    value: `${totalDays} day${totalDays !== 1 ? 's' : ''}`,        icon: '📋' },
                    { label: 'HOS Events',        value: `${data.hos_events.length}`,                            icon: '📌' },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="absolute top-0 right-0 p-3 opacity-20 text-3xl group-hover:scale-125 transition-transform">{icon}</div>
                      <div className="text-white font-black text-2xl tracking-tight">{value}</div>
                      <div className="text-slate-500 text-xs font-bold uppercase mt-1 tracking-widest">{label}</div>
                    </div>
                  ))}
                </div>
                <MapDisplay
                  geometry={data.geometry}
                  hosEvents={data.hos_events}
                  geocoded={data.geocoded}
                />
              </>
            ) : (
              <div className="rounded-2xl h-full min-h-[400px] flex flex-col items-center justify-center gap-6 shadow-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-slate-300 font-bold text-xl">Ready for Dispatch</p>
                  <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto px-4">Enter your route details to generate FMCSA-compliant log sheets and real-time mapping.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ELD Logbook */}
        {data && <EldLogbook events={data.hos_events} totalMiles={data.total_distance_miles} unit={unit} />}

      </main>
    </div>
  );
};

export default App;