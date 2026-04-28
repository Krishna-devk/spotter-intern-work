import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const EXAMPLES = {
  current_location:  'Chicago, IL',
  pickup_location:   'St. Louis, MO',
  dropoff_location:  'Dallas, TX',
  current_cycle_used: 22,
};

const AutocompleteField = ({ label, name, value, onChange, placeholder, hint }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (text) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const resp = await axios.get(`${API_URL}/api/routing/autocomplete/?text=${encodeURIComponent(text)}`);
      setSuggestions(resp.data);
      setShow(true);
    } catch (err) {
      console.error('Autocomplete failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(e); // Update parent state
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 400);
  };

  const select = (s) => {
    onChange({ target: { name, value: s } });
    setShow(false);
  };

  return (
    <div className={`relative ${show ? 'z-50' : 'z-10'}`} ref={containerRef}>
      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-label)' }}>{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required
          autoComplete="off"
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all pr-10"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            color: 'var(--text-main)',
          }}
          onFocus={() => value.length >= 3 && setShow(true)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}
      </div>

      {show && suggestions.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-1 rounded-lg border overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          style={{ 
            background: 'var(--bg-dropdown)',
            borderColor: 'var(--border-card)',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => select(s)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-500 hover:text-white transition-colors"
              style={{
                color: 'var(--text-main)',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-card)' : 'none'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
};

const Field = ({ label, name, type, step, min, max, value, onChange, placeholder, hint }) => (
  <div>
    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-label)' }}>{label}</label>
    <input
      type={type}
      name={name}
      step={step}
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required
      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
      style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-input)',
        color: 'var(--text-main)',
      }}
    />
    {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
  </div>
);

const InputForm = ({ onSubmit, isLoading }) => {
  const [form, setForm] = useState({
    current_location:   EXAMPLES.current_location,
    pickup_location:    EXAMPLES.pickup_location,
    dropoff_location:   EXAMPLES.dropoff_location,
    current_cycle_used: EXAMPLES.current_cycle_used,
  });

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit({ ...form, current_cycle_used: parseFloat(form.current_cycle_used) });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-8 flex flex-col gap-5 w-full backdrop-blur-md shadow-2xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      <h2 className="text-lg font-bold">Trip Details</h2>

      <AutocompleteField
        label="Current Location"
        name="current_location"
        value={form.current_location}
        onChange={handleChange}
        placeholder="e.g. Chicago, IL"
        hint="City, State or full address"
      />
      <AutocompleteField
        label="Pickup Location"
        name="pickup_location"
        value={form.pickup_location}
        onChange={handleChange}
        placeholder="e.g. St. Louis, MO"
      />
      <AutocompleteField
        label="Dropoff Location"
        name="dropoff_location"
        value={form.dropoff_location}
        onChange={handleChange}
        placeholder="e.g. Dallas, TX"
      />
      <Field
        label="Current Cycle Used (hrs)"
        name="current_cycle_used"
        type="number"
        step="0.5"
        min="0"
        max="70"
        value={form.current_cycle_used}
        onChange={handleChange}
        placeholder="e.g. 22"
        hint="Hours used in current 70-hr / 8-day cycle"
      />

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full py-3 rounded-lg font-bold text-white text-sm transition-all"
        style={{
          background: isLoading
            ? 'rgba(59,130,246,0.4)'
            : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Calculating…
          </span>
        ) : 'Calculate HOS Route'}
      </button>
    </form>
  );
};

export default InputForm;
