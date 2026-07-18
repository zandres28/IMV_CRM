# NOC Balanceo PCC - Ventana de Madrugada

**Router:** MikroTik CCR2116-12G-4S+  
**IP:** 192.168.1.9  
**Ventana objetivo:** 02:00-04:00  
**Operación esperada:** migrar clientes OLT de bridge1 a bridge_lan_nueva y validar balanceo WAN1/WAN2  
**Modo seguro:** si hay duda o degradación, aplicar rollback inmediato

---

## 1. Roles en mesa

**Operador**
- Ejecuta una sola fase a la vez.
- No avanza sin validación explícita.

**Verificador**
- Lee la salida del comando.
- Declara `GO`, `PAUSA` o `ROLLBACK`.

**Soporte**
- Confirma si entran reclamos reales de clientes.
- Reporta si navegación, WhatsApp, pagos o navegación general se afectan.

---

## 2. Regla de operación

**Secuencia obligatoria:**
1. Ejecutar.
2. Validar.
3. Decidir.
4. Documentar.

**Nunca hacer:**
- Dos cambios seguidos sin validación.
- Seguir si WAN2 está dudosa.
- “Probar un momento más” si hay degradación masiva.

---

## 3. Semáforo NOC

**VERDE**
- DHCP correcto.
- WAN2 estable.
- Leases nuevos creciendo.
- WAN1/WAN2 con tráfico.
- Sin reclamos o reclamos aislados.

**AMARILLO**
- Métricas ambiguas.
- WAN2 responde, pero no consistente.
- Pocos leases nuevos sin explicación.
- NAT o mangle sin crecimiento claro.

**ROJO**
- Reclamos múltiples.
- Ping o navegación inestable.
- WAN2 con pérdida o sin salida real.
- Clientes no reciben IP esperada.
- NAT no procesa o PCC no marca.

**Acción por semáforo:**
- Verde: avanzar.
- Amarillo: pausar y repetir validación.
- Rojo: rollback inmediato.

---

## 4. Línea de tiempo operativa

### 01:45 - Preparación de mesa

**Objetivo**
- Abrir sesión y dejar todo listo antes de tocar tráfico.

**Abrir en pantalla**
- Este archivo.
- Terminal PowerShell.
- Acceso MikroTik.
- OLT web.
- Canal de soporte.

**Comando 
**
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/mikrotik/balanceo_fases/run_balanceo_fase.ps1" -Fase precheck
```

**Esperado**
- Bridge y DHCP correctos.
- Backup creado con timestamp.
- Sin rastro de 192.168.10.0/24.

**GO si**
- `dhcp_pool0 = 192.168.1.100-192.168.1.253`
- `192.168.1.0/24 gateway = 192.168.1.9`
- `use-ip-firewall = yes`
- No existe red ni ruta `192.168.10.0/24`
- Backup/export creados

**NO-GO si**
- Cualquiera de los puntos anteriores falla

**Evidencia**
- Hora inicio: ________
- Backup OK: SI / NO
- GO / NO-GO: ________

---

### 01:55 - Validación WAN2

**Objetivo**
- Confirmar que WAN2 sirve para balanceo real antes de meter clientes.

**Validar**
- Link físico arriba.
- DHCP o IP correcta.
- Ping a gateway.
- Ping a internet real.

**Comandos de referencia**
```routeros
/interface ethernet set [find where name="11-WAN2"] disabled=no
/ip dhcp-client set [find where interface="11-WAN2"] disabled=no
/ip dhcp-client renew [find where interface="11-WAN2"]
:delay 3s
/ip dhcp-client print detail where interface="11-WAN2"
/ip address print detail where interface="11-WAN2"
/ping 192.168.40.1 interface=11-WAN2 count=5
/ping 1.1.1.1 interface=11-WAN2 count=5
/ping 8.8.8.8 interface=11-WAN2 count=5
/ping 9.9.9.9 interface=11-WAN2 count=5
```

**GO si**
- WAN2 obtiene IP o estado válido esperado
- Gateway responde sin pérdida importante
- Internet responde estable

**NO-GO si**
- WAN2 no levanta
- WAN2 solo llega al gateway pero no a internet
- WAN2 tiene pérdida o comportamiento errático

**Decisión**
- Si NO-GO: no activar balanceo, seguir solo WAN1 y reprogramar

**Evidencia**
- WAN2 estable: SI / NO
- GO / NO-GO: ________

---

### 02:00 - Activar monitoreo

**Objetivo**
- Dejar telemetría corriendo antes del corte.

**Comando**
```routeros
/system scheduler enable [find where name="pcc_monitor_every_2m"]
/system scheduler print detail where name="pcc_monitor_every_2m"
/system script run pcc_baseline_precheck
```

**GO si**
- Scheduler habilitado
- Baseline ejecuta sin errores

**Evidencia**
- Scheduler activo: SI / NO
- GO / NO-GO: ________

---

### 02:02 - Cutover

**Objetivo**
- Mover la OLT al bridge donde vive el balanceo.

**Comando sugerido**
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/mikrotik/balanceo_fases/run_balanceo_fase.ps1" -Fase cutover
```

**Cambio crítico real**
```routeros
/interface bridge port set [find where interface="1-LAN-OLT"] bridge=bridge_lan_nueva
```

**GO si**
- `1-LAN-OLT` queda en `bridge_lan_nueva`
- El comando no falla

**ROJO si**
- El puerto no cambia de bridge
- Se pierde acceso de forma anómala

**Evidencia**
- Hora cutover: ________
- Puerto cambiado: SI / NO
- GO / NO-GO: ________

---

### 02:03-02:08 - Validación inmediata

**Objetivo**
- Ver si el tráfico real comenzó a migrar correctamente.

**Comando sugerido**
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/mikrotik/balanceo_fases/run_balanceo_fase.ps1" -Fase validacion
```

**Verificar**
1. Leases `10.50.x.x` creciendo.
2. `WAN1_conn` y `WAN2_conn` creciendo.
3. NAT con tráfico para la LAN nueva.
4. Ping a internet OK.
5. Tráfico en WAN2 visible.

**GO si**
- Hay leases 10.50 subiendo progresivamente
- Hay marcas en ambas WAN
- Hay navegación estable
- Soporte no reporta caída general

**AMARILLO si**
- Los leases suben lento pero sí suben
- WAN2 tiene tráfico pero bajo
- Hay dudas sin caída masiva

**ROJO si**
- No aparecen leases 10.50
- WAN2 no marca nada o internet falla
- Entran reclamos múltiples de caída

**Evidencia**
- Leases 10.50: ________
- WAN1_conn: ________
- WAN2_conn: ________
- GO / PAUSA / ROLLBACK: ________

---

### 02:08-02:20 - Observación controlada

**Objetivo**
- Confirmar que no fue una falsa estabilidad de 1 minuto.

**Acción**
- Repetir validación cada 2 minutos.
- Confirmar con soporte si hay o no reclamos.
- Revisar que los contadores sigan creciendo.

**Comandos útiles**
```routeros
/system script run pcc_monitor_once
/log print where message~"PCC" or message~"WAN2" or message~"dhcp"
/ip dhcp-server lease print count-only where address~"10.50."
/ip firewall connection print count-only where connection-mark=WAN1_conn
/ip firewall connection print count-only where connection-mark=WAN2_conn
```

**GO final si**
- La operación sigue estable durante este bloque
- No hay ola de reclamos
- WAN2 se mantiene sana

**Evidencia**
- Observación estable: SI / NO
- Hora cierre técnico: ________

---

## 5. Rollback inmediato

**Disparadores directos**
1. Caída general o reclamos múltiples.
2. WAN2 inestable o degradada.
3. DHCP no migra a 10.50.
4. NAT/PCC no procesan correctamente.
5. Duda razonable sin explicación clara.

**Comando sugerido**
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/mikrotik/balanceo_fases/run_balanceo_fase.ps1" -Fase rollback
```

**Cambio real de rollback**
```routeros
/interface bridge port set [find where interface="1-LAN-OLT"] bridge=bridge1
```

**Después del rollback**
- Confirmar que `1-LAN-OLT` volvió a `bridge1`.
- Deshabilitar monitoreo de cambio.
- Confirmar recuperación de servicio.

**Evidencia**
- Hora rollback: ________
- Servicio recuperado: SI / NO

---

## 6. Matriz rápida de decisión

| Situación | Decisión |
|---|---|
| Todo correcto en precheck | GO |
| WAN2 dudosa | NO-GO |
| Cutover aplicado pero sin leases nuevos | PAUSA corta y revalidar |
| Sin leases nuevos + reclamos | ROLLBACK |
| WAN1 y WAN2 marcando y sin reclamos | GO |
| Métricas ambiguas sin impacto cliente | PAUSA |
| Impacto cliente visible | ROLLBACK |

---

## 7. Registro rápido de ventana

| Hora | Acción | Resultado | Decisión |
|---|---|---|---|
| 01:45 | Precheck | ________ | ________ |
| 01:55 | Validación WAN2 | ________ | ________ |
| 02:00 | Habilitar monitoreo | ________ | ________ |
| 02:02 | Cutover | ________ | ________ |
| 02:05 | Validación 1 | ________ | ________ |
| 02:10 | Validación 2 | ________ | ________ |
| 02:15 | Validación 3 | ________ | ________ |
| 02:20 | Cierre técnico | ________ | ________ |

---

## 8. Frase operativa de disciplina

**Si no hay un GO claro, la respuesta correcta es PAUSA o ROLLBACK.**
