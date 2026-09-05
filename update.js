const fs = require('fs');

function extractDateStr(updateItem) {
  if (!updateItem) return null;
  for (const field of updateItem) {
    if (typeof field === 'string' && /^\d{4}-\d{2}-\d{2}/.test(field)) {
      return field.split(' ')[0];
    }
  }
  for (const field of updateItem) {
    if (Array.isArray(field) && typeof field[0] === 'string' && /^\d{10}$/.test(field[0])) {
      const d = new Date(parseInt(field[0], 10) * 1000);
      return d.toISOString().split('T')[0];
    }
  }
  return null;
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
    const incidentList = rawData[0]?.[0]?.[0] || [];

    const parsedIncidents = [];

    for (const item of incidentList) {
      if (!Array.isArray(item)) continue;
      const [id, title, severity, updates, , affectedIds] = item;

      if (!Array.isArray(updates) || updates.length === 0) continue;

      const startDateStr = extractDateStr(updates[0]);
      const endDateStr = extractDateStr(updates[updates.length - 1]) || startDateStr;

      if (!startDateStr) continue;

      // 90일 필터를 제거하고 전체 인시던트를 수집하여 저장
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
    console.log(`Success! Total ${parsedIncidents.length} incidents saved.`);
  } catch (err) {
    console.error('Update script failed:', err);
    process.exit(1);
  }
}

run();
