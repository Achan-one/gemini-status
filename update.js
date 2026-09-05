const fs = require('fs');

async function run() {
  try {
    const res = await fetch('https://status.cloud.google.com/incidents.json');
    const rawIncidents = await res.json();

    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const targetIncidents = rawIncidents.filter(item => {
      const beginDate = new Date(item.begin);
      const isRecent = beginDate >= ninetyDaysAgo;
      const str = JSON.stringify(item.affected_products || '') + ' ' + (item.service_name || '') + ' ' + (item.external_desc || '');
      return isRecent && /Gemini|Generative|AI Studio|Live API/i.test(str);
    });

    const formatted = targetIncidents.map(inc => {
      const text = JSON.stringify(inc).toLowerCase();
      const affected = [];
      if (text.includes('live api')) affected.push(2);
      if (text.includes('studio')) affected.push(3);
      if (affected.length === 0 || text.includes('gemini') || text.includes('vertex')) affected.push(1);

      return {
        id: inc.id,
        title: inc.external_desc || inc.service_name,
        severity: inc.severity === 'high' ? 2 : 1,
        startDate: inc.begin.split('T')[0],
        endDate: (inc.end || inc.begin).split('T')[0],
        affectedComponents: affected
      };
    });

    const result = {
      lastSync: now.toISOString(),
      incidents: formatted
    };

    fs.writeFileSync('status.json', JSON.stringify(result, null, 2));
    console.log('status.json generated successfully.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
