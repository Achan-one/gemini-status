const fs = require('fs');

// 날짜 문자열 안전 추출 함수
function extractDate(updateItem) {
  if (!Array.isArray(updateItem)) return null;
  for (const val of updateItem) {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.split(' ')[0]; // "YYYY-MM-DD"
    }
  }
  return null;
}

// 다중 중첩 배열에서 실제 인시던트 배열(문자열 ID로 시작하는 항목들의 부모)을 찾는 함수
function findIncidentList(arr) {
  if (!Array.isArray(arr)) return [];
  // 현재 배열의 첫 원소가 ["AIStudio-...", "Issues...", ...] 형태인지 확인
  if (Array.isArray(arr[0]) && typeof arr[0][0] === 'string' && arr[0][0].includes('-')) {
    return arr;
  }
  for (const item of arr) {
    if (Array.isArray(item)) {
      const res = findIncidentList(item);
      if (res.length > 0) return res;
    }
  }
  return [];
}

async function run() {
  try {
    const API_URL = 'https://alkalimakersuite-pa.clients6.google.com/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/ListIncidentsHistory';

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json+protobuf',
        'x-goog-api-key': 'AIzaSyDdP816MREB3SkjZO04QXbjsigfcI0GWOs',
        'x-user-agent': 'grpc-web-javascript/0.1',
        'origin': 'https://aistudio.google.com',
        'referer': 'https://aistudio.google.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
        'x-browser-channel': 'stable',
        'x-browser-copyright': 'Copyright 2026 Google LLC. All Rights Reserved.',
        'x-browser-year': '2026'
      },
      body: JSON.stringify([])
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const rawData = await res.json();
    const incidentList = findIncidentList(rawData);

    console.log(`Found raw incidents count: ${incidentList.length}`);

    const parsedIncidents = [];

    for (const item of incidentList) {
      if (!Array.isArray(item)) continue;
      const [id, title, severity, updates, , affectedIds] = item;

      if (!Array.isArray(updates) || updates.length === 0) continue;

      const startDateStr = extractDate(updates[0]);
      const endDateStr = extractDate(updates[updates.length - 1]) || startDateStr;

      if (!startDateStr) continue;

      parsedIncidents.push({
        id: id || '',
        title: title || 'Service Incident',
        severity: typeof severity === 'number' ? severity : 1,
        startDate: startDateStr,
        endDate: endDateStr,
        affectedComponents: Array.isArray(affectedIds) ? affectedIds : [1]
      });
    }

    const result = {
      lastSync: new Date().toISOString(),
      incidents: parsedIncidents
    };

    fs.writeFileSync('status.json', JSON.stringify(result, null, 2));
    console.log(`Success! Saved ${parsedIncidents.length} incidents to status.json.`);
  } catch (err) {
    console.error('Update script failed:', err);
    process.exit(1);
  }
}

run();
