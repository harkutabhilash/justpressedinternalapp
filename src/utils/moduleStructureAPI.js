// src/utils/moduleStructureAPI.js

const web_app_id = "AKfycbw6hmM3eAXn36NgrHdfpQ33o6iWeldK3GAPATueQ_GdwFThrBKAV2PdGr_iJBNwWUCUdw";
const WEB_APP_URL = `https://script.google.com/macros/s/${web_app_id}/exec`;

async function callBackend(action, payload= {}) {
  const body = { action, ...payload };

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

export async function fetchAppModules(forceClear = false) {
  const cacheKey = 'appModulesCache';
  
  // Clear cache if forceClear is true
  if (forceClear) {
    sessionStorage.removeItem(cacheKey);
  }
  
  const cached = JSON.parse(sessionStorage.getItem(cacheKey));
  const expired = !cached || Date.now() - cached.timestamp > 3600000;

  if (cached && !expired) return cached.data;

  const data = await callBackend('getAppModules', null, { force: forceClear });
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
  return data;
}

export { callBackend };
