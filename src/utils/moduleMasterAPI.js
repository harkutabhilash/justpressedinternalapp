// src/utils/moduleMasterAPI.js

const web_app_id = "AKfycbw6hmM3eAXn36NgrHdfpQ33o6iWeldK3GAPATueQ_GdwFThrBKAV2PdGr_iJBNwWUCUdw";
const WEB_APP_URL = `https://script.google.com/macros/s/${web_app_id}/exec`;

// function getCacheKey(module) {
//   return `masterCache_${module}`;
// }

function getCacheKey(module, page) {
  return `masterCache_${module}_page_${page}`;
}

const TTL = 6 * 60 * 60 * 1000; // 6h

function getCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < TTL) return data;
  } catch {}
  return null;
}

// Generic fetch helper
async function callBackend(action, module, payload = {}) {
  const body = {
    action,
    module,
    ...payload,
  };

  //console.log("Calling backend:", body, WEB_APP_URL);

  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error ${action}: ${res.status} ${res.statusText} - ${errText}`);
  }

  return await res.json();
}

//Run in Console Logs, for any test any time
// const web_app_id = "AKfycbw6hmM3eAXn36NgrHdfpQ33o6iWeldK3GAPATueQ_GdwFThrBKAV2PdGr_iJBNwWUCUdw";
// const WEB_APP_URL = `https://script.google.com/macros/s/${web_app_id}/exec`;
// fetch(WEB_APP_URL, {
//   method: 'POST',
//   redirect: 'follow',
//   headers: {
//     'Content-Type': 'text/plain;charset=utf-8'
//   },
//   body: JSON.stringify({ action: 'getMasterData',module:'product' })
// })
//   .then(res => res.json())
//   .then(console.log)
//   .catch(console.error);

function setCache(key, data) {
  sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

// Fetch master records
export async function fetchMasterData(module) {
  const key = `dump_${module}`;
  const cached = getCache(key);
  if (cached) return cached;
  const res = await callBackend('getMasterData',  module );
  setCache(key, res);
  return res;
}

// export async function fetchMasterData(module, page = 1, force = false) {
//   const cacheKey = getCacheKey(module, page);
//   const cached = JSON.parse(sessionStorage.getItem(cacheKey));
//   const expired = !cached || Date.now() - cached.timestamp > 3600000;

//   if (!force && cached && !expired) 
//   {
//     console.log(`[CACHE] Using cached data for ${module} page ${page}`);
//     return cached.data;
//   }

//   const data = await callBackend('getMasterData', module, { page });
//   sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
//   return data;
// }

// Fetch dropdown values
export async function fetchDropdownOptions(module) {
  return await callBackend('getDropdowns', module);
}

// Add new record
export async function addRecord(module, record, userId) {
  const result = await callBackend('addRecord', module, { data: record, userId });
  sessionStorage.removeItem(getCacheKey(module)); // invalidate cache
  return result;
}

// Edit existing record
export async function editRecord(module, record, userId) {
  const result = await callBackend('editRecord', module, { data: record, userId });
  sessionStorage.removeItem(getCacheKey(module)); // invalidate cache
  return result;
}

// Delete record by primaryKey
export async function deleteRecord(module, primaryKey) {
  const result = await callBackend('deleteRecord', module, { primaryKey });
  sessionStorage.removeItem(getCacheKey(module)); // invalidate cache
  return result;
}

export { callBackend };

