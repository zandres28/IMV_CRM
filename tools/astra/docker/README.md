Este contenedor usa la imagen Docker de Astra y monta una configuracion derivada para Docker en docker/astra-test/config/config.docker-on-demand.json junto con la licencia en docker/astra-test/config/license.txt.

Uso:

docker compose -f docker-compose.astra-test.yml up -d
docker compose -f docker-compose.astra-test.yml ps
docker logs -f astra-test

Panel web:

http://127.0.0.1:18001/

Nota:

La imagen potterua/astra:latest se cae con una config minima en este entorno. Por eso este compose parte de una configuracion Astra real exportada desde WSL.

Sin license.txt el contenedor inicia y luego reinicia con el error License is not found.

La variante config.docker-on-demand.json deja http_keep_active en 0 para reducir conexiones permanentes cuando Astra corre sobre Docker Desktop.