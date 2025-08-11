import React, { useEffect, useState } from 'react';
import DynamicFormRenderer from './DynamicFormRenderer.js';
import Loader from './components/Loader';
import { fetchLogFormConfig } from './utils/logFormAPI.js';

function LogManagement({ module }) {
  const [config, setConfig] = useState([]);
  const [dropdowns, setDropdowns] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const { configRows, dropdownMap } = await fetchLogFormConfig(module);
          //const [headers, ...rows] = configRows;

         // If backend sends array-of-objects (your current case), use as-is.
        // If it ever sends array-of-arrays, normalize it (fallback).
        let formatted = configRows;
        if (Array.isArray(configRows) && Array.isArray(configRows[0])) {
          const [headers, ...rows] = configRows;
          formatted = rows.map(row =>
            headers.reduce((obj, key, i) => {
              obj[key] = row[i];
              return obj;
            }, {})
          );
        }

        // Coerce booleans to real booleans so UI filters work
        formatted = formatted.map(f => ({
          ...f,
          showInApp: f.showInApp === true || String(f.showInApp).toLowerCase() === 'true',
          isRequired: f.isRequired === true || String(f.isRequired).toLowerCase() === 'true',
        }));

        setConfig(formatted);
        setDropdowns(dropdownMap || {});
      } catch (err) {
        console.error('Failed to load form config', err);
      } finally {
        setLoading(false);
      }
    };

    if (module) loadConfig();
  }, [module]);

  if (loading) return <Loader message={`Setting up ${module} form...`} />;

  return (
    <div className="content-panel">
      {/* <h2 className="content-header">{module} Entry Form</h2> */}
      <DynamicFormRenderer config={config} dropdowns={dropdowns} module={module} />
    </div>
  );
}

export default LogManagement;
