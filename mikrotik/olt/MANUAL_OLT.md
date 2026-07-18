# Manual de Operaciones OLT (CLI)

**Acceso SSH:**
```bash
ssh admin@192.168.100.1
# Ingrese su contraseña cuando se le solicite
```

> **Nota:** Este manual ha sido validado para la OLT **Wolck WK-OLT-16PG-B2** (Arquitectura C-DATA/FD16xx).

---

## 0. Información del Sistema
Para conocer el modelo exacto, versión de firmware y tiempo de actividad.

```bash
# Modo Privilegiado (#)
display version
```

---

## 1. Identificación y Búsqueda

> **Estructura de Comandos:**
> A diferencia de Huawei, en esta OLT la mayoría de listas y gestiones se hacen **dentro de la interfaz GPON**.
>
> 1. Entra a configuración: `config`
> 2. Entra a la tarjeta: `interface gpon 0/0`
> 3. Ejecuta los comandos.

### Identificar ONUs (Lista Completa)
El método verificado para ver todas las ONUs, su ID y descripción es entrar a la configuración de la tarjeta.

```bash
# 1. Entrar a modo configuración
WK-OLT# config

# 2. Entrar a la tarjeta GPON (Slot 0)
WK-OLT(config)# interface gpon 0/0

# 3. Listar ONUs de un puerto específico (Ej: Puerto 1)
WK-OLT(config-gpon-0/0)# show ont info 1 all
```

**Salida exitosa:**
```text
----------------------------------------------------------------------------------------
 F/S P  ONT  SN            Control  Run     Config    Match    Desc
        ID                 flag     state   state     state
----------------------------------------------------------------------------------------
 0/0 1  1    DF51A6B7...   Active   Online  success   match    JUAN ALBERTO...
 0/0 1  2    DF51A6B7...   Active   Online  success   match    LIZBETH...
```

### Buscar ONU por Serial
Ideal para encontrar rápidamente en qué puerto está conectado un equipo específico.

```bash
# Sintaxis: show ont info by-sn <SERIAL>
WK-OLT(config-gpon-0/0)# show ont info by-sn DF51A6B759BD
```

---

## 2. Gestión de ONUs (Configuración)

**Requisito previo:** Debes estar dentro de la interfaz GPON. Fíjate en el texto entre paréntesis de tu línea de comandos.

*   Si dice `WK-OLT(config)#` -> Escribe `interface gpon 0/0`.
*   Si ya dice `WK-OLT(config-gpon-0/0)#` -> **¡Ya estás dentro!** Pasa directo a los comandos de abajo.

### Agregar o Cambiar Descripción
En la lista de opciones aparece explícitamente el comando `description`. Esta es la forma correcta en tu versión.

```bash
# Sintaxis: ont description <puerto> <onu_id> <Descripción>
# Ejemplo para Puerto 1, ONU 2 (SIN COMILLAS):
WK-OLT(config-gpon-0/0)# ont description 1 2 LIZBETH_MONTOYA_TEST
```

### Reiniciar una ONU (Reboot Device)
Útil cuando el cliente reporta lentitud o bloqueo.

```bash
# Sintaxis: ont reboot <puerto> <onu_id>
WK-OLT(config-gpon-0/0)# ont reboot 1 2
```

---

## 3. Control de Servicio

### Deshabilitar una ONU (Cortar servicio)
Apaga el servicio al cliente (LOS parpadeando o apagado).

```bash
# Sintaxis: ont deactivate <puerto> <onu_id>
WK-OLT(config-gpon-0/0)# ont deactivate 1 2
```

### Habilitar una ONU (Restaurar servicio)

```bash
# Sintaxis: ont activate <puerto> <onu_id>
WK-OLT(config-gpon-0/0)# ont activate 1 2
```

---

## 4. Guardar Cambios
¡Muy importante! Si no guardas, al reiniciarse la OLT se perderán las descripciones y configuraciones.

```bash
# Salir de la interfaz GPON
exit

# Guardar
save
# O en algunos modelos:
write
```

---

## Resumen Rápido (Cheat Sheet)

| Acción | Comando (Dentro de interface gpon 0/0) |
| :--- | :--- |
| **Listar Todos** | `show ont info <puerto> all` |
| **Poner Nombre** | `ont description <puerto> <id> NOMBRE_SIN_COMILLAS` |
| **Reiniciar** | `ont reboot <puerto> <id>` |
| **Apagar** | `ont deactivate <puerto> <id>` |
| **Prender** | `ont activate <puerto> <id>` |
| **Buscar SN** | `show ont info by-sn <SERIAL>` |
