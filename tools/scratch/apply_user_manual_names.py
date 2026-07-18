import json
path='/etc/astra/astra.conf'
with open(path,'r',encoding='utf-8') as f:
    data=json.load(f)
maps = {
  'Adult Swim':'AdultSwim',
  'America TV':'Canal América Televisión',
  'ATV':'ATV +',
  'Baby TV':'BABY TV',
  'CARACOL HD 2':'CARACOL INTERNACIONAL',
  'De Pelicula Clasico':'DE PELICULA',
  'Discovery Turbo':'DISCOVERY TURBO',
  'Discovery World HD':'DISCOVERY WORLD HD',
  'Ecuavisa':'Ecuavisa Internacional (ECUA)',
  'El Gourmet':'El Gourmet HD(GOURHD)',
  'Enlace':'ENLACE',
  'ESPN Premium HD':'ESPN Premium (HD)(ESPHD)',
  'EWTN':'Network(EWTN)',
  'Las Estrellas HD':'CANAL DE LAS ESTRELLAS'
}
count = 0
for stream in data.get('make_stream', []):
    name = stream.get('name')
    if name in maps:
        stream['name'] = maps[name]
        count += 1
with open(path,'w',encoding='utf-8',newline='') as f:
    json.dump(data,f,ensure_ascii=False,indent=4)
print(count)