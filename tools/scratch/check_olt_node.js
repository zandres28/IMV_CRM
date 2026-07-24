const crypto = require('crypto');
const host = process.env.OLT_HOST || '192.168.1.94';
const port = process.env.OLT_WEB_PORT || '8080';
const baseUrl = `http://${host}:${port}/cgi-bin/h.cgi`;

async function login() {
  const password = process.env.OLT_PASSWORD || 'IMV*2025*';
  const md5pass = crypto.createHash('md5').update(password).digest('hex');
  const response = await fetch(`${baseUrl}?module=sys_login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Usrname: process.env.OLT_USER || 'admin', Password: md5pass })
  });
  const result = await response.json();
  console.log('Login code:', result.code);
  if (result.code === 0 && result.data?.token) {
    return result.data.token;
  }
  throw new Error('Login failed: ' + result.description);
}

async function getSystemInfo(token) {
  const response = await fetch(`${baseUrl}?module=sys_info`, {
    headers: { 'token': token, 'Content-Type': 'application/json' }
  });
  const result = await response.json();
  console.log('System info:', JSON.stringify(result, null, 2));
  return result;
}

async function getOnuList(token) {
  const response = await fetch(`${baseUrl}?module=onu_list_get`, {
    headers: { 'token': token, 'Content-Type': 'application/json' }
  });
  const result = await response.json();
  console.log('ONU list code:', result.code);
  if (result.data?.list) {
    const onus = result.data.list;
    console.log('Total ONUs:', onus.length);
    const offline = onus.filter(o => o.RunningState === 0);
    console.log('Offline ONUs:', offline.length);
    offline.forEach(o => console.log(`  - ${o.OnuDesc || 'N/A'} | SN:${o.PonSn} | PON:${o.PonId} | ONU-ID:${o.OnuId} | State:${o.RunningState}`));
    const online = onus.filter(o => o.RunningState === 1);
    console.log('Online ONUs:', online.length);
  }
  return result;
}

(async () => {
  try {
    const token = await login();
    console.log('Token obtained:', token?.substring(0, 20) + '...');
    await getOnuList(token);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();