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

async function getOnuList(token) {
  const r = await fetch(baseUrl + '?module=onu_list_get', {
    headers: { token, 'Content-Type': 'application/json' }
  });
  const j = await r.json();
  const onu = j.data?.list?.find(o => o.PonId === '0/0/10' && o.OnuId === 1);
  console.log('Current ONU state:', JSON.stringify(onu, null, 2));
}

async function testActivate(token) {
  const bodies = [
    { PonId: '0/0/10', OnuId: 1, Action: 'activate' },
    { PonId: '0/0/10', OnuId: '1', Action: 'activate' },
    { PonId: '0/0/10', OnuId: 1, Action: 'add' },
    { PonId: '0/0/10', OnuId: 1, Action: 1 },
  ];
  for (const body of bodies) {
    const r = await fetch(baseUrl + '?module=onu_manual_add', {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    console.log('Params:', JSON.stringify(body), '-> Response:', JSON.stringify(j));
  }
}

(async () => {
  try {
    const token = await login();
    console.log('Login OK, token length:', token.length);
    await getOnuList(token);
    console.log('\n--- Testing onu_manual_add ---');
    await testActivate(token);
  } catch(e) { console.error('ERROR:', e.message); }
})();