FROM node:20-alpine

# GenieACS corre sobre Node.js y requiere utilidades de red/diagnostico basicas.
RUN apk add --no-cache bash curl tini \
  && npm install -g genieacs@1.2.13

WORKDIR /opt/genieacs
RUN mkdir -p /opt/genieacs/ext /var/log/genieacs

ENTRYPOINT ["/sbin/tini", "--"]
