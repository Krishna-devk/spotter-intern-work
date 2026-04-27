import React, { useState } from 'react';

const EXAMPLES = {
  current_location:  'Chicago, IL',
  pickup_location:   'St. Louis, MO',
  dropoff_location:  'Dallas, TX',
  current_cycle_used: 22,
};

const Field = ({ label, name, type = 'text', step, min, max, value, onChange, placeholder, hint }) => (
  <div>
    <label className="block text-sm font-semibold mb-1" style={{ color: '#93c5fd' }}>{label}</label>
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
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#f1f5f9',
      }}
      onFocus={e => (e.target.style.border = '1px solid #3b82f6')}
      onBlur={e  => (e.target.style.border = '1px solid rgba(255,255,255,0.2)')}
    />
    {hint && <p className="text-xs mt-1" style={{ color: '#64748b' }}>{hint}</p>}
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
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <h2 className="text-lg font-bold text-white">Trip Details</h2>

      <Field
        label="Current Location"
        name="current_location"
        value={form.current_location}
        onChange={handleChange}
        placeholder="e.g. Chicago, IL"
        hint="City, State or full address"
      />
      <Field
        label="Pickup Location"
        name="pickup_location"
        value={form.pickup_location}
        onChange={handleChange}
        placeholder="e.g. St. Louis, MO"
      />
      <Field
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
            : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
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
