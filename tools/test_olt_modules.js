#!/usr/bin/env node
const crypto = require('crypto');
const baseUrl = 'http://192.168.100.1:80/cgi-bin/h.cgi';

async function login() {
  const md5pass = crypto.createHash('md5').update('IMV*2025*').digest('hex');
  const r = await fetch(baseUrl + '?module=sys_login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Usrname: 'admin', Password: md5pass })
  });
  const j = await r.json();
  if (j.code === 0 && j.data?.token) return j.data.token;
  throw new Error('Login: ' + j.description);
}

async function testGET(token, module) {
  const r = await fetch(baseUrl + '?module=' + module, {
    headers: { token, 'Content-Type': 'application/json' }
  });
  return await r.json();
}

(async () => {
  try {
    const token = await login();
    console.log('Login OK');

    // Probe various modules that might exist
    const modules = [
      'onu_list_get',          // known to work
      'onu_modify', 'onu_state', 'onu_control',
      'onu_active', 'onu_enable', 'onu_reactivate',
      'onu_set', 'onu_update',
      'onu_cfg', 'sys_info'
    ];
    for (const mod of modules) {
      const j = await testGET(token, mod);
      if (j.code === 0) {
        console.log(`${mod}: ✅ CODE 0`);
        const str = JSON.stringify(j).substring(0, 200);
        console.log(`  ${str}`);
      } else if (j.data || j.list || j.description) {
        console.log(`${mod}: code=${j.code} desc=${j.description}`);
      } else {
        // empty/not found
      }
    }

  } catch(e) { console.error('ERROR:', e.message); }
})();