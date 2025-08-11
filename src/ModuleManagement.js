// src/ModuleManagement.js
import React, { useEffect, useMemo, useState } from 'react';
import { fetchMasterData } from './utils/moduleMasterAPI'; // returns the full dump for a module
import { paginate } from './utils/paginate';
import Loader from './components/Loader';

function ModuleManagement({ module }) {
  const [dump, setDump] = useState({ headers: [], rows: [], totalRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // client-side pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // fetch once per module (from session cache if present)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!module) return;
      setLoading(true);
      setMessage('');
      setPage(1); // reset page when module changes
      try {
        const t0 = performance.now();
        const res = await fetchMasterData(module); // { headers, rows, totalRecords }
        if (cancelled) return;
        setDump(res || { headers: [], rows: [], totalRecords: 0 });
        if (!res?.rows?.length) {
          setMessage(`No records to fetch, please add data to ${module}`);
        }
        const t1 = performance.now();
        console.log(`⏱ ${module} dump fetched in ${(t1 - t0).toFixed(1)} ms`);
      } catch (err) {
        console.error(`Failed to load ${module} data:`, err);
        if (!cancelled) setMessage('Failed to load data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [module]);

  // compute current page slice on the fly
  const { slice: pageRows, pages } = useMemo(
    () => paginate(dump.rows || [], page, limit),
    [dump.rows, page, limit]
  );

  // pick headers to render (fallback to keys of first row if headers empty)
  const headers = useMemo(() => {
    if (dump.headers?.length) return dump.headers;
    return dump.rows?.[0] ? Object.keys(dump.rows[0]) : [];
  }, [dump.headers, dump.rows]);

  return (
    <div className="content-panel">
      {loading ? (
        <Loader message={`Relax, fetching ${module} data...`} />
      ) : message ? (
        <p className="text-center text-gray-600">{message}</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table-auto-width">
              <thead className="table-header-bg">
                <tr>
                  {headers.map(h => (
                    <th key={h} className="table-header-text">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="table-body-bg">
                {pageRows.map((row, idx) => (
                  <tr key={idx} className="table-row-border">
                    {headers.map(h => (
                      <td key={h} className="table-cell-text">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {pages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                className="btn-secondary"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>

              <span className="text-sm font-medium">
                Page {page} of {pages} • {dump.totalRecords} total
              </span>

              <button
                className="btn-secondary"
                onClick={() => setPage(p => Math.min(p + 1, pages))}
                disabled={page === pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ModuleManagement;
