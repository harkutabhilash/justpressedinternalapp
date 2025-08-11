// src/components/FormField.js
import React, { useEffect, useRef, useState } from 'react';

function FormField({ field, value, onChange, options = [], error, onDropdownOpen }) {
  const { key, label, placeholderText, inputType, dataType } = field;
  const [localOptions, setLocalOptions] = useState(options);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(null);

  useEffect(() => {
    setLocalOptions(options || []);
  }, [options]);

  const ensureOptions = async () => {
    if (localOptions.length > 0 || !onDropdownOpen) return;
    if (inFlight.current) return;
    setLoading(true);
    try {
      inFlight.current = onDropdownOpen(); // returns Promise<string[]>
      const fresh = await inFlight.current;
      setLocalOptions(Array.isArray(fresh) ? fresh : []);
    } catch {
      setLocalOptions([]);
    } finally {
      inFlight.current = null;
      setLoading(false);
    }
  };

  const renderInput = () => {
    switch (inputType) {
      case 'dropdown':
        return (
          <select
            className={`jp-select ${error ? 'border-red-500' : ''}`}
            value={value}
            onFocus={ensureOptions}
            onMouseDown={ensureOptions}
            onChange={(e) => onChange(e.target.value)}
            aria-busy={loading ? 'true' : 'false'}
          >
            <option value="">
              {loading ? 'Fetching dropdown options…' : (placeholderText || `Select ${label}`)}
            </option>
            {localOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            className={`jp-input ${error ? 'border-red-500' : ''}`}
            placeholder={placeholderText || label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
          />
        );
      case 'radio':
        return (
          <div className="flex gap-4 mt-1">
            {localOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => onChange(e.target.value)}
                  className="jp-radio"
                />
                {opt}
              </label>
            ))}
          </div>
        );
      default:
        return (
          <input
            type={inputType || (dataType === 'number' ? 'number' : 'text')}
            className={`jp-input ${error ? 'border-red-500' : ''}`}
            placeholder={placeholderText || label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="jp-group">
      <label htmlFor={key} className="jp-label">{label}</label>
      {renderInput()}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export default FormField;
