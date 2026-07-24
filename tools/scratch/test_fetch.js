async function main() {
  const tests = [
    { url: 'http://nginx-proxy-manager:81/', label: 'NPM HTTP' },
    { url: 'http://imvevoapi.duckdns.org:8080/', label: 'evoapi DNS HTTP' },
    { url: 'https://imvevoapi.duckdns.org:8080/', label: 'evoapi DNS HTTPS' },
    { url: 'http://172.21.0.5:8080/', label: 'evoapi IP direct' },
  ];

  for (const t of tests) {
    try {
      const c = new AbortController();
      setTimeout(() => c.abort(), 5000);
      const r = await fetch(t.url, { signal: c.signal, method: 'GET' });
      console.log(`${t.label}: HTTP ${r.status}`);
    } catch (e) {
      console.log(`${t.label}: ${e.message || e.code || e}`);
    }
  }
}
main().catch(e => console.error('Error:', e.message));