# tools/

Carpeta de tooling, integraciones, despliegues y archivos operativos
**separados del núcleo del CRM** (backend/, frontend/, docker-compose.yml).
Cada subcarpeta agrupa un producto o flujo independiente.

## Estructura

```
tools/
├── astra/                        ← Middleware IPTV Astra (independiente del CRM)
│   ├── docker-compose.astra-test.yml
│   ├── docker/                   Dockerfile + config/license para pruebas
│   ├── scripts/                  3 scripts PowerShell (EPG, playlist, names)
│   └── docs/                     CSVs/M3U/JSON de inventario y equivalencias
│
├── genieacs/                     ← Stack TR-069 (ACS para CPEs)
│   ├── docker-compose.temp.yml   Compose antiguo (referencia)
│   ├── deploy/                   Dockerfile, compose oficial y .env.example
│   ├── nginx/                    Config de proxy para GenieACS UI
│   └── docs/GENIEACS_TR069_VPS.md
│
├── backup/                       ← Backup/restore de la base de datos MySQL
│   ├── BACKUPS.md
│   ├── backup_db.sh
│   ├── backup_cron.sh
│   ├── restore_db.sh
│   └── docker-dump.sql           Dump de la DB (no trackeado por *.sql)
│
├── vps/                          ← Despliegue en el VPS
│   ├── deploy_vps.sh
│   ├── INSTRUCCIONES_VPS.md
│   ├── README-VPS.md
│   └── build_output.txt          Log del último `docker compose build`
│
├── integrations/                 ← Integraciones externas
│   ├── evolution-api/            Configuración Evolution API → n8n
│   ├── whatsapp-ocr/             README-claude: OCR de pagos WhatsApp
│   ├── postman/                  Colección Postman de pruebas
│   └── n8n-workflows-viejos/     Workflows n8n antiguos (respaldo)
│
├── test/                         ← Contenedores de prueba
│   ├── docker-compose.ubuntu-test.yml
│   └── docker/Dockerfile         Ubuntu con tooling de red (curl, jq, etc.)
│
├── scratch/                      ← Archivos de desarrollo/scratch del proyecto
│   │                                (CSVs seed de import, .xlsm, .sql, previews JSON)
│   │                                *Importante*: rutas esperadas por el backend
│   │                                - tools/scratch/CLIENTES.csv
│   │                                - tools/scratch/INSTALACIONES.csv
│   │                                - tools/scratch/PAGOS_INSTALACIONES.csv
│   │                                - tools/scratch/pon-clientes.csv
│
└── archive/                      ← Histórico/archivo (antes _archivo/)
    ├── debug-data/               JSON de debug de recordatorios
    ├── dev-tools/                Migrate-to-docker, ngrok, test n8n endpoints
    ├── scripts-debug/            Scripts .ts de depuración puntuales
    ├── scripts-ia/               Scripts de entrenamiento Chatwoot
    └── n8n-workflows-viejos/     (ver integrations/)
```

## Convenciones

- Esta carpeta es **auxiliar**: su contenido no se requiere para que el CRM
  funcione en producción. El backend la usa solo para los CSVs de `scratch/`
  durante el seed/import de datos.
- El volumen `./tools/scratch:/app/tmp` está montado en el servicio `backend`
  dentro de `docker-compose.yml`, por lo que los CSVs quedan accesibles dentro
  del contenedor.
- Los scripts de `backup/` apuntan a `./backups/` en la raíz; la variable
  `BACKUP_DIR` puede ajustarse para apuntar a `tools/backup/` si se desea.
