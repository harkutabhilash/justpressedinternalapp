// src/utils/dropdownProvider.js
import { fetchMasterData } from './moduleMasterAPI';

function unwrapDump(raw) {
  // Accept {data:{...}, timestamp} OR raw {...}
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data) return parsed.data;           // wrapped
    if (parsed && parsed.rows && parsed.headers) return parsed; // raw legacy
    return null;
  } catch {
    return null;
  }
}

function getDump(module) {
  return unwrapDump(sessionStorage.getItem(`dump_${module}`));
}

// Optional: normalize (migrate) legacy raw dumps to wrapped shape when seen
function normalizeDump(module, dumpData) {
  sessionStorage.setItem(
    `dump_${module}`,
    JSON.stringify({ data: dumpData, timestamp: Date.now() })
  );
}

export async function getOptionsFromModuleSource(source) {
  const [module, propRaw] = String(source).split('.');
  const prop = (propRaw || '').trim();
  if (!module || !prop) return [];

  // 1) try cache (handles wrapped/raw)
  let dump = getDump(module);

  // 2) fetch if not cached
  if (!dump) {
    dump = await fetchMasterData(module);              // returns the RAW dump data
    // write back in the WRAPPED shape so all writers are consistent
    normalizeDump(module, dump);
  }

  const rows = Array.isArray(dump?.rows) ? dump.rows : [];
  if (rows.length === 0) return [];

  // case-insensitive prop resolution
  let resolvedKey = prop;
  if (!(resolvedKey in rows[0])) {
    const lower = prop.toLowerCase();
    const match = Object.keys(rows[0]).find(k => k.toLowerCase() === lower);
    if (match) resolvedKey = match;
  }

  const uniq = new Set();
  for (const r of rows) {
    const v = r?.[resolvedKey]; // ← use resolvedKey
    if (v !== undefined && v !== null && `${v}`.trim() !== '') {
      uniq.add(String(v));
    }
  }

  return Array.from(uniq).sort((a, b) => a.localeCompare(b));
}
