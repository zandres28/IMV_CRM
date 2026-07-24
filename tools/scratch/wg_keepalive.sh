#!/bin/bash
# WireGuard keepalive con resolución DDNS
# Se ejecuta cada 5 minutos desde un cron

DDNS_DOMAIN="imv-iptv.ddns.net"
WG_INTERFACE="wg0"
PEER_PUBKEY="e0dE7FknO6Nciuq9LA4LnErHh1EW/1Cmt7MM0OyR3xY="
WG_PORT=51820
LOG_TAG="[WG-Keepalive]"

# 1. Verificar si el peer tiene handshake reciente (< 3 min)
HANDSHAKE=$(sudo wg show "$WG_INTERFACE" latest-handshakes | grep "$PEER_PUBKEY" | awk '{print $2}')
NOW=$(date +%s)

if [ -n "$HANDSHAKE" ] && [ $((NOW - HANDSHAKE)) -lt 180 ]; then
    echo "$LOG_TAG Handshake OK ($((NOW - HANDSHAKE))s atrás)"
    exit 0
fi

echo "$LOG_TAG Sin handshake reciente ($([ -n "$HANDSHAKE" ] && echo "$((NOW - HANDSHAKE))s" || echo 'nunca'))"

# 2. Resolver DDNS
RESOLVED_IP=$(dig +short "$DDNS_DOMAIN" @8.8.8.8 2>/dev/null | head -1)

if [ -z "$RESOLVED_IP" ]; then
    RESOLVED_IP=$(dig +short "$DDNS_DOMAIN" @1.1.1.1 2>/dev/null | head -1)
fi

if [ -n "$RESOLVED_IP" ]; then
    echo "$LOG_TAG DDNS resuelve a $RESOLVED_IP:$WG_PORT"
    sudo wg set "$WG_INTERFACE" peer "$PEER_PUBKEY" endpoint "${RESOLVED_IP}:${WG_PORT}"
    sleep 5
    HANDSHAKE_NEW=$(sudo wg show "$WG_INTERFACE" latest-handshakes | grep "$PEER_PUBKEY" | awk '{print $2}')
    if [ -n "$HANDSHAKE_NEW" ] && [ $((NOW - HANDSHAKE_NEW)) -lt 60 ]; then
        echo "$LOG_TAP Conexion restablecida con $RESOLVED_IP:$WG_PORT"
    else
        echo "$LOG_TAG No se pudo restablecer con $RESOLVED_IP:$WG_PORT"
    fi
else
    echo "$LOG_TAG DDNS $DDNS_DOMAIN no resuelve - no se puede actualizar endpoint"
fi