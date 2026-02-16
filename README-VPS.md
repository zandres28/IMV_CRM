# Despliegue VPS (manual)

Guía rápida para reconstruir el `frontend` y verificar la sesión desde el VPS sin depender de GitHub Actions.

## Requisitos previos

- Tener el repositorio clonado en el VPS (`/ruta/al/CRM-2025`).
- Docker y Docker Compose instalados.
- Acceso SSH al VPS con usuario que pueda ejecutar `docker`.

## Paso 0: Preparar el entorno (una sola vez)

```bash
cd /ruta/al/CRM-2025
git fetch origin
git checkout master
```

## Paso 1: Ejecutar el script de despliegue

El script `deploy_vps.sh` ya contiene los pasos necesarios:

```bash
cd /ruta/al/CRM-2025
chmod +x deploy_vps.sh          # si es la primera vez
./deploy_vps.sh                 # reconstruye, reinicia contenedores y corre migraciones
```

El script realiza:

1. `git pull origin master`
2. `docker compose up -d --build --remove-orphans`
3. `docker compose exec backend npm run migration:run`
4. `docker image prune -f`

## Paso 2: Validar acceso al frontend

1. Revisa los logs de Nginx/React para asegurarte de que la build terminó sin errores críticos:

```bash
docker compose logs frontend --tail 200
```

2. Asegúrate de que el backend esté respondiendo (`/api/auth/me` debe devolver 200 si el token es válido):

```bash
TOKEN=$(curl -s -X POST http://localhost:3010/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@netflow.com","password":"admin123"}' | jq -r '.accessToken')
curl -H "Authorization: Bearer $TOKEN" http://localhost:3010/api/auth/me
```

Si la segunda llamada devuelve datos de usuario, las solicitudes desde el navegador podrán mantener la sesión.

3. Borra el caché/`localStorage` en el navegador del VPS o del cliente si ya tenías fallos previos.

## Paso 3: (Opcional) monitorear logs para errores de sesión

- Para ver registros en vivo:

```bash
docker compose logs -f frontend backend
```

- Si la app sigue redirigiendo al login, revisa la consola del navegador y el endpoint `/api/auth/me` (debe retornar 200 con el token que se guarda en `localStorage`).

## Bonus: incidentes comunes

- **`axios` no encuentra `REACT_APP_API_URL`**: al construir el `frontend`, el valor viene del `docker-compose.yml` (línea `REACT_APP_API_URL`). Asegúrate de usar la IP pública del backend.
- **Autenticación rota al abrir la app**: editamos `frontend/src/App.tsx` para que el `verify()` solo se llame cuando hay token; ya está en la rama principal, basta reconstruir como describe el script.

Con esto estás listo para volver a poner el `frontend` en servicio y verificar que la sesión del usuario se mantiene.