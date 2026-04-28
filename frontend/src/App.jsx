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
  const [theme, setTheme]     = useState(() => localStorage.getItem('theme') || 'dark');
  const [lastFormData, setLastFormData] = useState({ ...EXAMPLES });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    handleCalculate({ ...EXAMPLES });
  }, []);

  // Re-calculate automatically when unit changes for HOS precision
  useEffect(() => {
    if (data && lastFormData) {
      handleCalculate(lastFormData);
    }
  }, [unit]);

  const handleCalculate = async (formData) => {
    setLoading(true);
    setError(null);
    setLastFormData(formData); // Save for unit-toggling or re-runs
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

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500/30 theme-transition`} style={{ background: 'var(--bg-page)', color: 'var(--text-main)' }}>
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
            <h1 className="text-4xl font-black tracking-tight uppercase">Spotter <span className="text-blue-500">HOS</span></h1>
          </div>
          <p className="text-lg font-medium max-w-2xl mx-auto opacity-70">
            FMCSA-Compliant ELD Engine for Property Carriers
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Active Rule: 70hr / 8-Day
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-20 flex flex-col gap-10">

        {/* Global Controls */}
        <div className="flex justify-end items-center gap-4 px-2">
           <div className="flex p-1 rounded-lg border shadow-inner backdrop-blur-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-slate-700/10 transition-colors mr-1"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                )}
              </button>
              <div className="w-px h-6 opacity-20 self-center mx-1" style={{ backgroundColor: 'var(--text-main)' }} />
              <button 
                onClick={() => setUnit('miles')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider transition-all ${unit === 'miles' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}
              >MILES</button>
              <button 
                onClick={() => setUnit('km')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider transition-all ${unit === 'km' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}
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
              <p className="font-bold">Calculation Error</p>
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
                    { 
                      label: 'Total Distance',    
                      value: `${distVal.toFixed(1)} ${unitLabel}`,   
                      color: 'text-blue-500',
                      bg: 'bg-blue-500/10',
                      icon: (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      )
                    },
                    { 
                      label: 'Driving Time',      
                      value: `${(data.total_duration_minutes / 60).toFixed(1)} hrs`, 
                      color: 'text-purple-500',
                      bg: 'bg-purple-500/10',
                      icon: (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )
                    },
                    { 
                      label: 'Total Log Days',    
                      value: `${totalDays} day${totalDays !== 1 ? 's' : ''}`,        
                      color: 'text-emerald-500',
                      bg: 'bg-emerald-500/10',
                      icon: (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      )
                    },
                    { 
                      label: 'HOS Events',        
                      value: `${data.hos_events.length}`,                            
                      color: 'text-rose-500',
                      bg: 'bg-rose-500/10',
                      icon: (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )
                    },
                  ].map(({ label, value, icon, color, bg }) => (
                    <div key={label} className="group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                      <div className={`absolute top-4 right-4 p-2 rounded-xl ${bg} ${color} transition-transform group-hover:scale-110 shadow-lg`}>
                        {icon}
                      </div>
                      <div className="font-black text-2xl tracking-tight mt-2">{value}</div>
                      <div className="opacity-50 text-xs font-bold uppercase mt-1 tracking-widest">{label}</div>
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
                <div className="w-20 h-20 rounded-full bg-slate-800/10 flex items-center justify-center">
                  <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-bold text-xl opacity-80">Ready for Dispatch</p>
                  <p className="opacity-50 text-sm mt-2 max-w-sm mx-auto px-4">Enter your route details to generate FMCSA-compliant log sheets and real-time mapping.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ELD Logbook */}
        {data && <EldLogbook events={data.hos_events} totalMiles={data.total_distance_miles} unit={unit} locations={data.locations} />}

      </main>
    </div>
  );
};

export default App;