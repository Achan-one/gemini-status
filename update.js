const fs = require('fs');

async function run() {
  try {
    // 세션 쿠키 없이 정식 공개 API 키만으로 호출 가능한 엔드포인트
    const API_URL = 'https://alkalimakersuite-pa.clients6.google.com/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/ListIncidentsHistory';

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json+protobuf',
        'x-goog-api-key': 'AIzaSyDdP816MREB3SkjZO04QXbjsigfcI0GWOs',
        'x-user-agent': 'grpc-web-javascript/0.1'
      },
      body: JSON.stringify([])
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const rawData = await res.json();
    const incidentList = rawData[0][0][0] || [];

    // 최근 90일 기준 계산
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const parsedIncidents = [];

    for (const item of incidentList) {
      const [id, title, severity, updates, , affectedIds] = item;
      if (!updates || updates.length === 0) continue;

      const startDateStr = updates[0][1].split(' ')[0]; // "YYYY-MM-DD"
      const endDateStr = updates[updates.length - 1][1].split(' ')[0];
      const startDate = new Date(startDateStr);

      // 90일 이내 발생한 장애만 필터링
      if (startDate >= ninetyDaysAgo) {
        parsedIncidents.push({
          id,
          title,
          severity, // 1: 부분장애(노랑/주황), 2+: 주요장애(빨강)
          startDate: startDateStr,
          endDate: endDateStr,
          affectedComponents: affectedIds || [] // [1]: API, [2]: Live, [3]: Studio
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
