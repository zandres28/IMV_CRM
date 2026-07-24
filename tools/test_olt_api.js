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

async function test(token, module, body = {}) {
  const url = baseUrl + '?module=' + module;
  const opts = { headers: { token, 'Content-Type': 'application/json' } };
  if (Object.keys(body).length > 0) {
    opts.method = 'POST';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(url, opts);
  const j = await r.json();
  return j;
}

(async () => {
  try {
    const token = await login();
    console.log('Login OK');

    // Try various modules for activating/reactivating an ONU
    const modulesToTry = [
      'onu_modify',
      'onu_state',
      'onu_control',
      'onu_active',
      'onu_enable',
    ];

    for (const mod of modulesToTry) {
      const j = await test(token, mod, { PonId: '0/0/10', OnuId: 1 });
      console.log(`${mod}:`, JSON.stringify(j));
      if (j.code === 0) {
        console.log(`  ^^^ FOUND WORKING MODULE ^^^`);
      }
    }

    // Try activating via onu_manual_add with additional params
    console.log('\n--- onu_manual_add variations ---');
    const variations = [
      { PonId: '0/0/10', OnuId: 1, Action: 'enable' },
      { PonId: '0/0/10', OnuId: 1, Action: 'on' },
      { PonId: '0/0/10', OnuId: 1, Action: '1' },
      { PonId: '0/0/10', OnuId: 1, Action: 0 },
    ];
    for (const v of variations) {
      const j = await test(token, 'onu_manual_add', v);
      console.log(JSON.stringify(v), '->', JSON.stringify(j));
    }

    // Check if onu_modify works for reading
    console.log('\n--- onu_modify (GET first to check) ---');
    const m = await test(token, 'onu_modify');
    console.log('onu_modify:', JSON.stringify(m));

    // Check if there's a GET endpoint for onu_manual_add to see expected params
    console.log('\n--- onu_manual_add (GET) ---');
    const ma = await test(token, 'onu_manual_add');
    console.log('onu_manual_add GET:', JSON.stringify(ma));

    // NOTE: onu_deactive test SKIPPED to avoid disrupting active service
    console.log('\n--- SKIPPED onu_deactive (active installation) ---');

  } catch(e) { console.error('ERROR:', e.message); }
})();