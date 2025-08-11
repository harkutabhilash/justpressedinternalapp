// src/utils/dateUtils.js
export function formatDateToDDMMMYYYY(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
          .replace(/ /g, '-');
}

export function getCurrentDateTime() {
  const now = new Date();
  return now.toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
  }).replace(/,/g, '');
}
