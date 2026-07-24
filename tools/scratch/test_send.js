async function main() {
  const payload = {
    number: '573334006212',
    text: '🔧 *PRUEBA* - Sistema de monitoreo OLT funcionando correctamente'
  };

  try {
    const r = await fetch('http://imvevoapi.duckdns.org:8080/message/sendText/imv_chatwoot2', {
      method: 'POST',
      headers: {
        'apikey': '979AF1D6D474-435D-89FB-725780FC0F99',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await r.text();
    console.log(`HTTP ${r.status}: ${body.substring(0, 200)}`);
  } catch (e) {
    console.error('Error:', e.message || e);
  }
}
main().catch(e => console.error(e.message));