const crypto = require('crypto');
async function main() {
  const baseUrl = 'http://192.168.100.1:80/cgi-bin/h.cgi';
  const md5pass = crypto.createHash('md5').update('IMV*2025*').digest('hex');
  const r1 = await fetch(baseUrl + '?module=sys_login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Usrname: 'admin', Password: md5pass })
  });
  const login = await r1.json();
  console.log('Login code:', login.code);
  if (login.code !== 0) { console.log('Login failed:', login.description); return; }
  const token = login.data.token;
  console.log('Token obtained');
  const r2 = await fetch(baseUrl + '?module=onu_list_get', {
    headers: { token, 'Content-Type': 'application/json' }
  });
  const list = await r2.json();
  console.log('ONU list code:', list.code);
  if (list.data && list.data.list) {
    const onus = list.data.list;
    console.log('Total ONUs:', onus.length);
    console.log('Online:', onus.filter(o=>o.RunningState===1).length);
    console.log('Offline:', onus.filter(o=>o.RunningState===0).length);
    onus.filter(o=>o.RunningState===0).forEach(o => console.log('  OFFLINE:', o.OnuDesc||'N/A', 'PON:'+o.PonId, 'ID:'+o.OnuId, 'SN:'+o.PonSn));
  }
}
main().catch(e => console.error('Error:', e.message));