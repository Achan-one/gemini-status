const fs = require('fs');

async function run() {
  try {
    const API_URL = 'https://alkalimakersuite-pa.clients6.google.com/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/ListIncidentsHistory';

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json+protobuf',
        'x-goog-api-key': 'AIzaSyDdP816MREB3SkjZO04QXbjsigfcI0GWOs',
        'x-user-agent': 'grpc-web-javascript/0.1',
        // 403 방지를 위한 필수 브라우저 위장 헤더
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
    const incidentList = rawData[0][0][0] || [];

    // 최근 90일 계산
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const parsedIncidents = [];

    for (const item of incidentList) {
      const [id, title, severity, updates, , affectedIds] = item;
      if (!updates || updates.length === 0) continue;

      const startDateStr = updates[0][1].split(' ')[0];
      const endDateStr = updates[updates.length - 1][1].split(' ')[0];
      const startDate = new Date(startDateStr);

      if (startDate >= ninetyDaysAgo) {
        parsedIncidents.push({
          id,
          title,
          severity, // 1: degraded(노랑), 2+: outage(빨강)
          startDate: startDateStr,
          endDate: endDateStr,
          affectedComponents: affectedIds || []
        });
      }
    }

    const result = {
      lastSync: now.toISOString(),
      incidents: parsedIncidents
    };

    fs.writeFileSync('status.json', JSON.stringify(result, null, 2));
    console.log(`Success! ${parsedIncidents.length} incidents saved.`);
  } catch (err) {
    console.error('Update script failed:', err);
    process.exit(1);
  }
}

run();
