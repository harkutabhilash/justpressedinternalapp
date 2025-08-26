// src/utils/logFormAPI.js
import { callBackend, fetchAppModules } from './moduleStructureAPI';

export async function fetchLogFormConfig(module) {
  const cacheKey = `${module}_formConfigCache`;
  const cached = JSON.parse(sessionStorage.getItem(cacheKey));
  const cacheMs = 6 * 60 * 60 * 1000;
  if (cached && Date.now() - cached.timestamp < cacheMs) return cached.data;

  // ensure appModules in cache
  let appModulesCache = JSON.parse(sessionStorage.getItem('appModulesCache'));
  if (!appModulesCache?.data) {
    await fetchAppModules(true);
    appModulesCache = JSON.parse(sessionStorage.getItem('appModulesCache'));
  }

  const matched = appModulesCache?.data?.find(g => g.modules.some(m => m.module === module));
  const sheetId  = matched?.modules.find(m => m.module === module)?.sheetId;
  if (!sheetId) throw new Error(`No sheetId found for ${module}`);

  // --- fetch config & dropdowns
  const cfg = await callBackend('getSheetData', { sheetId, tab: 'config' });
  const dds = await callBackend('getSheetData', { sheetId, tab: 'dropdowns' });

  // --- normalize CONFIG
  const fields = normalizeConfig(cfg).filter(f => f.showInApp && f.key);

  if (!fields.length) {
    console.error('fetchLogFormConfig: config normalization produced 0 fields. Raw cfg:', cfg);
    throw new Error('Form configuration empty – check config tab or normalizer.');
  }

  // --- normalize DROPDOWNS
  const dropdowns = normalizeDropdowns(dds);

  const finalData = { fields, dropdowns, sheetId };
  sessionStorage.setItem(cacheKey, JSON.stringify({ data: finalData, timestamp: Date.now() }));
  return finalData;
}

/* ---------------- helpers ---------------- */

function normalizeConfig(cfg) {
  // Case 1: already an array of objects
  if (Array.isArray(cfg)) return cfg.map(normalizeFieldRow);

  // Case 2: wrapped in .data
  if (cfg?.data) return normalizeConfig(cfg.data);

  // Case 3: { headers, rows }
  if (cfg?.headers && cfg?.rows) {
    const headers = cfg.headers;
    return cfg.rows.map(r => {
      // r can be an array or an object keyed by header
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (r && (r[h] ?? r[i]));
      });
      return normalizeFieldRow(obj);
    });
  }

  // Case 4: { rows: [ {..}, {..} ] }
  if (cfg?.rows && Array.isArray(cfg.rows) && cfg.rows.length && typeof cfg.rows[0] === 'object') {
    return cfg.rows.map(normalizeFieldRow);
  }

  // Unknown shape
  console.warn('normalizeConfig: unknown cfg shape', cfg);
  return [];
}

function normalizeFieldRow(obj) {
  const toBool = (v) => String(v).toLowerCase() === 'true';
  const numOr0 = (v) => (v === '' || v == null ? 0 : Number(v));

  const out = { ...obj };
  out.showInApp  = toBool(out.showInApp);
  out.isRequired = toBool(out.isRequired);
  out.formRow    = numOr0(out.formRow);
  out.formColumn = numOr0(out.formColumn);

  const dt = String(out.dataType || '').toLowerCase();
  if (/^float|^number/.test(dt)) {
    out.dataType  = 'number';
    out.inputType = out.inputType || 'number';
  }
  if (String(out.inputType).toLowerCase() === 'date') {
    out.dataType = 'date';
  }
  // explicit disabled flag
  out.isDisabled = String(out.isDisabled).toLowerCase() === 'true';

  return out;
}

function normalizeDropdowns(dds) {
  // Case A: map of arrays { key: string[] }
  if (dds && typeof dds === 'object' && !Array.isArray(dds) && !dds.rows) {
    const out = {};
    for (const [k, arr] of Object.entries(dds)) {
      const vals = Array.isArray(arr) ? arr : [];
      out[k] = uniqueSorted(vals.map(v => String(v ?? '').trim()).filter(Boolean));
    }
    return out;
  }

  // Case B: array of row objects or { rows: [...] }
  const rows = Array.isArray(dds) ? dds : (dds?.rows || []);
  const tmp = {};
  for (const row of rows) {
    Object.entries(row || {}).forEach(([k, v]) => {
      const s = String(v ?? '').trim();
      if (!s) return;
      (tmp[k] ||= new Set()).add(s);
    });
  }
  const out = {};
  Object.keys(tmp).forEach(k => out[k] = uniqueSorted(Array.from(tmp[k])));
  return out;
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}
