import { callBackend, fetchAppModules } from './moduleStructureAPI';

export async function fetchLogFormConfig(module) {
  const cacheKey = `${module}_formConfigCache`;
  const cached = JSON.parse(sessionStorage.getItem(cacheKey));
  const cacheDuration = 6 * 60 * 60 * 1000;

  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data;
  }

  let appModulesCache = JSON.parse(sessionStorage.getItem('appModulesCache'));

  // ✅ Added fallback logic to fetch appModules if cache is not available
  if (!appModulesCache || !appModulesCache.data) {
    console.log("appModulesCache not found in session storage. Fetching from backend...");
    await fetchAppModules(true); // This will refresh sessionStorage
    appModulesCache = JSON.parse(sessionStorage.getItem('appModulesCache'));
  }

  const matched = appModulesCache?.data?.find(group =>
    group.modules.some(mod => mod.module === module)
  );

  const sheetId = matched?.modules.find(m => m.module === module)?.sheetId;
  if (!sheetId) throw new Error(`No sheetId found for ${module}`);

//  const payload = { sheetId, tab: 'config' };
  const configRows = await callBackend('getSheetData', { sheetId, tab: 'config' });

  const dropdownMap = await callBackend('getSheetData', { sheetId, tab: 'dropdowns' });
  
  const finalData = { configRows, dropdownMap };

  sessionStorage.setItem(cacheKey, JSON.stringify({ data: finalData, timestamp: Date.now() }));

  return finalData;

}
