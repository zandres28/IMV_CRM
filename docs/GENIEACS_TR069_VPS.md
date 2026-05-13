# GenieACS TR-069 (TR09) en Docker para VPS

Esta guia deja GenieACS operativo en contenedores Docker, separado de tu stack principal del CRM.

## 1) Archivos creados

- `deploy/genieacs/Dockerfile`
- `deploy/genieacs/docker-compose.genieacs.yml`
- `deploy/genieacs/genieacs.env.example`

## 2) Preparacion inicial

Desde la raiz del repo:

```bash
cd /home/ubuntu/imv_crm/deploy/genieacs
cp genieacs.env.example genieacs.env
mkdir -p ext
```

Edita `genieacs.env` y cambia al menos:

- `MONGO_INITDB_ROOT_PASSWORD`
- `GENIEACS_MONGODB_CONNECTION_URL`
- `GENIEACS_UI_JWT_SECRET`

## 3) Levantar servicios

```bash
docker compose -f docker-compose.genieacs.yml up -d --build
```

Servicios resultantes:

- CWMP (TR-069): `0.0.0.0:7547` (publico para CPE/ONT)
- NBI API: `127.0.0.1:7557` (solo local)
- FS API: `127.0.0.1:7567` (solo local)
- UI: `127.0.0.1:3005` (solo local; publicar via Nginx)

## 4) Inicializacion de la UI

La version desplegada de GenieACS inicia la UI con un wizard de inicializacion de base de datos. Ya quedo validado que la UI responde en el VPS por:

- `http://127.0.0.1:3005`

Abre la UI a traves de un proxy HTTPS y completa el wizard inicial desde el navegador.

Importante:

- En este stack no deje un comando de alta de usuario local porque no quedo validado en el binario empaquetado.
- La proteccion de acceso recomendada en tu VPS es por reverse proxy, usando Nginx Proxy Manager o autenticacion HTTP en Nginx.

## 5) Configuracion TR-069 en CPE/ONT

En cada CPE configura:

- ACS URL: `http://TU_DOMINIO_O_IP:7547/`
- Usuario ACS: (si aplica por fabricante)
- Password ACS: (si aplica por fabricante)
- Periodic Inform Enable: `true`
- Periodic Inform Interval: 300 a 900 segundos

## 6) Pruebas de salud

```bash
# Estado de contenedores
docker compose -f docker-compose.genieacs.yml ps

# Ver logs de CWMP
docker compose -f docker-compose.genieacs.yml logs -f genieacs-cwmp

# Ver logs de UI
docker compose -f docker-compose.genieacs.yml logs -f genieacs-ui

# Validar que CWMP responde en el VPS
curl -i http://127.0.0.1:7547/
```

## 7) Apertura de firewall en VPS

Permite al menos:

- TCP 7547 (entrada desde Internet, idealmente restringido por origen)
- TCP 3005 solo local (si publicas UI con Nginx, no abras 3005 a Internet)

## 8) Publicar la UI con dominio

### Opcion recomendada: Nginx Proxy Manager

Ya tienes `nginx-proxy-manager` corriendo en el VPS. La forma mas limpia es crear un Proxy Host con estos valores:

- Domain Names: `acs.tudominio.com`
- Scheme: `http`
- Forward Hostname / IP: `127.0.0.1`
- Forward Port: `3005`
- Websockets Support: activado
- Block Common Exploits: activado
- SSL: solicita certificado Let's Encrypt y fuerza HTTPS

Si quieres proteger la UI, crea tambien un Access List en Nginx Proxy Manager y asignala al Proxy Host.

### Opcion alternativa: Nginx manual

Publica la UI por reverse proxy a `127.0.0.1:3005` y protege con HTTPS.

Bloque minimo ejemplo:

```nginx
server {
  listen 80;
  server_name acs.tudominio.com;

  location / {
    proxy_pass http://127.0.0.1:3005;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 9) Comandos utiles

```bash
# Reiniciar GenieACS
docker compose -f docker-compose.genieacs.yml restart

# Parar stack GenieACS
docker compose -f docker-compose.genieacs.yml down

# Actualizar imagen base y rebuild
docker compose -f docker-compose.genieacs.yml build --no-cache
docker compose -f docker-compose.genieacs.yml up -d
```

## 10) Notas de seguridad

- No expongas NBI (7557) ni FS (7567) a Internet.
- Protege la UI por Access List en Nginx Proxy Manager o por autenticacion HTTP en Nginx.
- Usa passwords robustas y rotacion periodica.
- Habilita TLS en UI (Nginx + Certbot).
- Para alta disponibilidad, agrega backups de `genieacs_mongo_data`.
