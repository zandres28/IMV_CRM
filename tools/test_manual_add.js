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

async function apiPost(token, module, body) {
  const r = await fetch(baseUrl + '?module=' + module, {
    method: 'POST',
    headers: { token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return await r.json();
}

(async () => {
  try {
    const token = await login();
    console.log('Login OK');

    // 1. Find deactivated ONUs (ControlFlag = 0)
    const listR = await apiPost(token, 'onu_list_get', { PageNumber: 0, PageSize: 200 });
    const onus = listR.data?.list || [];
    const deactivated = onus.filter(o => o.ControlFlag === 0);
    console.log(`Total ONUs: ${onus.length}, Deactivated: ${deactivated.length}`);
    deactivated.forEach(o => console.log(`  ${o.PonId}/${o.OnuId} - ${o.OnuDesc} - SN:${o.PonSn}`));

    // 2. For a deactivated ONU, try onu_manual_add variations
    if (deactivated.length > 0) {
      const d = deactivated[0];
      console.log(`\nTesting onu_manual_add on deactivated ONU: ${d.PonId}/${d.OnuId}`);
      
      const variations = [
        { PonId: d.PonId, OnuId: d.OnuId, Action: 'activate' },
        { PonId: d.PonId, OnuId: d.OnuId, Action: 'add' },
        { PonId: d.PonId, OnuId: d.OnuId, Action: 1 },
        { PonId: d.PonId, OnuId: d.OnuId, Action: 'activate', LineProfileName: '', SrvProfileName: '' },
        { OnuId: d.OnuId, Action: 'activate' },
        { PonId: d.PonId, Action: 'activate' },
      ];
      for (const v of variations) {
        const j = await apiPost(token, 'onu_manual_add', v);
        console.log(`  ${JSON.stringify(v)} -> code=${j.code} desc="${j.description}"`);
      }
    } else {
      console.log('\nNo deactivated ONUs found. Trying variations on active ONU 0/0/10:1');
      // Try with different parameter combinations
      const extras = [
        { PonId: '0/0/10', OnuId: 1, Action: 'activate', OnuDesc: 'PRUEBAS' },
        { PonId: '0/0/10', OnuId: 1, Action: 'activate', ControlFlag: 1 },
        { PonId: '0/0/10', OnuId: 1, Action: 'activate', PonSn: 'DF51A6B79D91' },
      ];
      for (const v of extras) {
        const j = await apiPost(token, 'onu_manual_add', v);
        console.log(`  ${JSON.stringify(v)} -> code=${j.code} desc="${j.description}"`);
      }
    }

  } catch(e) { console.error('ERROR:', e.message); }
})();