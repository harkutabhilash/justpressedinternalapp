// src/modules/Production.jsx
import React from 'react';
import DynamicFormRenderer from '../DynamicFormRenderer';
import { fetchLogFormConfig } from '../utils/logFormAPI';
import Loader from '../components/Loader';

export default function Production() {
  const [cfg, setCfg] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    let ok = true;
    (async () => {
      try {
         const { fields, dropdowns } = await fetchLogFormConfig('bottling');
         if (!ok) return;
         setCfg({ fields, dropdowns });
      } catch (e) {
        setErr('Failed to load form.');
      } finally {
        ok && setLoading(false);
      }
    })();
    return () => (ok = false);
  }, []);

  //if (loading) return <div className="p-6">Loading…</div>;
  if (loading) return <Loader message="appBeingReady" />;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <DynamicFormRenderer
      module="bottling"
      config={cfg.fields}
      dropdowns={cfg.dropdowns}
    />
  );
}

