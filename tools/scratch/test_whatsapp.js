async function main() {
  const endpoints = [
    { url: 'http://172.21.0.5:8080', label: 'Internal IP' },
    { url: 'https://imvevoapi.duckdns.org:8080', label: 'External DNS' },
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.url + '/');
      console.log(`${ep.label}: HTTP ${r.status}`);
    } catch (e) {
      console.log(`${ep.label}: FAILED (${e.message})`);
    }
  }

  const payload = {
    number: '573334006212',
    text: '🔧 PRUEBA - Sistema de monitoreo OLT funcionando correctamente'
  };

  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.url + '/message/sendText/imv_chatwoot2', {
        method: 'POST',
        headers: {
          'apikey': '979AF1D6D474-435D-89FB-725780FC0F99',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = await r.text();
      console.log(`${ep.label} send: HTTP ${r.status} -> ${body.substring(0, 100)}`);
    } catch (e) {
      console.log(`${ep.label} send: FAILED (${e.message})`);
    }
  }
}
main().catch(e => console.error('Error:', e.message));