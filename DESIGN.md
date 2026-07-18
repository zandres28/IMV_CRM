---
name: Nexum CRM
description: All-in-one ISP management platform
colors:
  primary: "#2D5BFF"
  primary-deep: "#1B3FCC"
  accent: "#00D4A6"
  neutral-canvas: "#F4F6FB"
  neutral-surface: "#FFFFFF"
  neutral-sunken: "#EDF0F7"
  neutral-border: "#E2E6F0"
  neutral-ink: "#0E1330"
  neutral-ink-soft: "#3A4163"
  neutral-muted: "#6B7290"
  semantic-warning: "#F0A23A"
  semantic-danger: "#E5484D"
  semantic-info: "#3DA5F5"
  dark-canvas: "#0B1020"
  dark-surface: "#121833"
  dark-ink: "#E6E9F5"
typography:
  display:
    fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif'
    fontWeight: 700
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif'
    fontWeight: 700
    letterSpacing: "-0.02em"
  title:
    fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif'
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: '"DM Sans", "Inter", system-ui, sans-serif'
    fontWeight: 400
  label:
    fontFamily: '"DM Sans", "Inter", system-ui, sans-serif'
    fontWeight: 600
    textTransform: uppercase
    letterSpacing: "0.12em"
rounded:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}px"
    padding: "14px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}px"
    padding: "14px 22px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}px"
    height: "auto"
  chip:
    backgroundColor: "rgba(45,91,255,0.12)"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}px"
    padding: "0 10px"
    height: "24px"
---

# Design System: Nexum CRM

## 1. Overview

**Creative North Star: "El Panel de Ingeniería"**

Nexum CRM visualiza la gestión ISP como una consola de ingeniería moderna: seria, precisa, con profundidad. El sistema envuelve al operador en una interfaz de alto contraste donde el contenido respira sobre un fondo claro mientras la navegación se retira a un panel oscuro y sustancial. Cada pantalla comunica competencia técnica sin caer en la densidad abrumadora del software ISP legacy.

La atmósfera es de control y confianza. Los componentes tienen peso — botones con gradiente firme, tarjetas con elevación palpable, sombras que jerarquizan sin ruido. El color azul corporativo (#2D5BFF) funciona como ancla visual: aparece en estados activos, botones primarios, y enlaces, ocupando menos del 15% de cualquier pantalla. El acento verde-teal (#00D4A6) marca éxito, confirmación y rutas secundarias. Juntos crean un lenguaje visual que se siente tanto institucional como contemporáneo.

**Key Characteristics:**
- Shell oscuro + contenido claro (panel de control permanente, superficie de trabajo luminosa)
- Gradientes azules sutiles como atmósfera de fondo, no como decoración
- Bordes definidos (1px) en todos los contenedores — la estructura es explícita
- Tipografía display expresiva (Bricolage Grotesque) con cuerpo utilitario (DM Sans)
- Sin animaciones ornamentales — solo respuesta funcional (hover, colapso, transición de estado)

## 2. Colors

La paleta se organiza en dos mundos: el shell de navegación (oscuro, profundo, con sutiles gradientes de acento) y la superficie de trabajo (clara, limpia, con azul como único acento cromático).

### Primary
- **Azul Corporativo** (#2D5BFF): El ancla visual del sistema. Botones primarios, enlaces, indicadores de selección, bordes activos. Su saturación controlada (oklch ~0.58 0.24 255) le da presencia sin gritar.
- **Azul Profundo** (#1B3FCC): Extremo inferior del gradiente de botones primarios y hover state. Aporta peso y contención.

### Secondary
- **Verde Ingeniería** (#00D4A6): Botones secundarios, estados exitosos (conexiones activas, pagos confirmados), indicadores positivos. Funciona como contrapunto cromático al azul.

### Semantic
- **Ambar Alerta** (#F0A23A): Advertencias, suspensiones, estados pendientes.
- **Rojo Crítico** (#E5484D): Errores, eliminaciones, clientes en mora, indicadores de caída.
- **Azul Información** (#3DA5F5): Chips informativos, hints contextuales.

### Neutral
- **Lienzo** (#F4F6FB): Fondo de página. Azul-gris muy claro que se siente técnico, no cálido.
- **Superficie** (#FFFFFF): Tarjetas, papeles, contenedores. Blanco puro para contraste máximo.
- **Hundido** (#EDF0F7): Encabezados de tabla, áreas que necesitan retroceder visualmente.
- **Borde** (#E2E6F0): Líneas divisorias, bordes de tarjeta. Siempre 1px sólido.
- **Tinta** (#0E1330): Texto primario. Azul-negro profundo, casi negro — máximo contraste.
- **Tinta Suave** (#3A4163): Texto de cuerpo. Suficiente contraste (~6.5:1 sobre lienzo).
- **Apagado** (#6B7290): Texto secundario, placeholders, metadatos.

### Dark Shell
- **Lienzo Nocturno** (#0B1020): Fondo del sidebar. Casi negro con matiz azul ultramar.
- **Superficie Nocturna** (#121833): AppBar superior. Un paso más claro que el sidebar.
- **Tinta Nocturna** (#E6E9F5): Texto sobre fondos oscuros. Blanco azulado suave.

### Named Rules
**La Regla de Proporción.** El azul corporativo ocupa ≤15% de cualquier pantalla. Su rareza es lo que le da peso. Un botón primario por vista, no más.

## 3. Typography

**Display Font:** Bricolage Grotesque (con DM Sans como fallback)
**Body Font:** DM Sans (con Inter y system-ui como fallback)
**Label/Mono Font:** JetBrains Mono (solo para métricas y porcentajes de delta)

**Character:** Contraste de actitud. Las cabeceras usan Bricolage Grotesque, una grotesca geométrica con personalidad — pesos pesados (700-800) y tracking negativo que comunica autoridad técnica. El cuerpo usa DM Sans, una sans-serif humanista limpia y legible que se retira para dejar que los datos hablen. La pareja es una voz actual de herramienta profesional: segura en los titulares, eficiente en el cuerpo.

### Hierarchy
- **Display** (700, clamp(1.8rem, 3.5vw, 3rem), 1.1): Títulos de página en dashboards y vistas principales. text-wrap: balance.
- **Headline** (700, clamp(1.4rem, 2.5vw, 2rem), 1.2): Títulos de sección dentro de una página. text-wrap: balance.
- **Title** (600, clamp(1rem, 1.5vw, 1.25rem), 1.3): Títulos de tarjetas, nombres de recursos.
- **Body** (400, 0.875rem / 14px, 1.5): Texto corriente, contenido de tablas, descripciones. Máximo 75 caracteres por línea en párrafos largos.
- **Label** (600, 0.65rem / 10.4px, 1.2, 0.12em letter-spacing, uppercase): Etiquetas de navegación, subtítulos de sección, metadatos.

### Named Rules
**La Regla de la Voz Única.** Sin pares de fuentes que compitan. Una display expresiva + una utilitaria. No mezclar dos geométricas ni dos humanistas.

## 4. Elevation

Nexum CRM usa un sistema de elevación híbrido. Las superficies son planas en reposo — la profundidad no es el estado por defecto, sino el resultado de la interacción. Tres niveles definidos:

### Shadow Vocabulary
- **Superficie en reposo** (`0 1px 0 rgba(14,19,48,0.04), 0 8px 24px -16px rgba(14,19,48,0.18)`): Tarjetas, papeles. Una sombra ambiental tenue que sugiere altura sin apenas notarse. La línea superior de 1px actúa como light border, no como sombra.
- **Superficie elevada** (`0 1px 0 rgba(14,19,48,0.06), 0 16px 32px -18px rgba(14,19,48,0.28)`): Tarjetas en hover. La elevación se duplica, el borde se tiñe del azul corporativo. La transición de 200ms ease transform + shadow + border comunica respuesta táctil.
- **Modal / Diálogo** (`0 24px 48px -12px rgba(14,19,48,0.4)`): Modales y diálogos. La capa más alta, visiblemente por encima de todo.

### Named Rules
**La Regla de Elevación Bajo Demanda.** Las superficies son planas en reposo. La elevación aparece solo como respuesta al estado (hover, focus, modal abierto). Una tarjeta estática nunca tiene sombra.

## 5. Components

### Buttons
- **Shape:** Esquinas definidas (10px). Sin redondeos exagerados.
- **Primary:** Gradiente vertical de Azul Corporativo (#2D5BFF) a Azul Profundo (#1B3FCC). Sombra proyectada de 8px 20px -10px del azul corporativo al 60%. Padding: 14px horizontal, 8px vertical.
- **Hover / Focus:** El gradiente oscurece hacia #142FAA en el extremo inferior. La sombra se intensifica (12px 24px -10px al 70%). Sin transformación — el gradiente + la sombra ya comunican respuesta.
- **Outlined:** Borde de 1px de `neutral-border` (#E2E6F0). Sin fondo. Hover: fondo sutil.
- **Text:** Sin borde ni fondo. Color azul corporativo. Hover: opacidad reducida.

### Cards
- **Corner Style:** Esquinas generosas (16px).
- **Background:** Superficie blanca (#FFFFFF) sobre lienzo azul-gris muy claro.
- **Shadow Strategy:** Elevación híbrida (ver Elevación). Sombra tenue en reposo, elevación marcada + borde azul al hover. Transición de 200ms ease en transform, shadow y border-color.
- **Border:** 1px sólido de borde neutral (#E2E6F0).

### Chips
- **Style:** Fondo tintado al 12-14% de opacidad del color semántico correspondiente. Texto al 100% del mismo color. Sin borde o borde muy sutil (0.5px opcional).
- **Shape:** Esquinas suaves (8px). Altura fija de 20-24px. Font-weight 600.
- **State:** Los chips de estado (activo/suspendido/cancelado) usan el color semántico correspondiente sin variación.

### Inputs / Fields
- **Style:** Borde de 1px de borde neutral. Fondo blanco. Radio 8px. Size pequeño por defecto.
- **Focus:** Borde cambia a azul corporativo. Sin glow.
- **Error:** Borde cambia a rojo crítico (#E5484D). Texto de error debajo del campo.
- **Disabled:** Opacidad reducida al 50%.

### Navigation (Sidebar)
- **Container:** Fondo Lienzo Nocturno (#0B1020) con gradiente radial del azul corporativo y acento verde en opacidad muy baja.
- **Items:** Alto 40px, padding horizontal 12px, margen 2px 8px. Radio 10px.
- **Default:** Íconos al 55% de opacidad sobre blanco nocturno. Sin fondo.
- **Active:** Fondo azul corporativo al 18% con borde interior de 1px al 35%. Texto e íconos blancos completos.
- **Hover:** Fondo blanco al 5%.
- **Section Headers:** Texto en Label uppercase, 0.72rem, peso 700, tracking 0.12em, opacidad reducida.

### Data Tables
- **Container:** Paper con borde de 1px. Radio 16px.
- **Header:** Fondo Hundido (#EDF0F7). Texto en Label uppercase (0.65rem, peso 800, color azul corporativo 4e73df). Altura de fila compacta.
- **Rows:** Altura compacta (size="small"). Hover con fondo azul muy claro (#f8f9fc). Cursor pointer en filas cliqueables.
- **Status Cell:** Chip semántico incrustado en la celda.

### Dialogs
- **Shape:** Radio grande (24px). Borde de 1px.
- **Shadow:** Nivel modal (el más alto del sistema de elevación).
- **Actions:** Botón primario (confirmar) + outlined (cancelar). Alineados a la derecha.

## 6. Do's and Don'ts

### Do:
- **Do** usar el azul corporativo en exactamente un botón primario por vista. Un segundo botón primario diluye el peso.
- **Do** usar la pareja Bricolage Grotesque + DM Sans en todas las superficies. Sin mezclar otras fuentes display.
- **Do** dejar que los datos respiren. Espaciado mínimo de 16px entre secciones, 8px entre elementos relacionados.
- **Do** usar sombras visibles en hover y modales. La elevación es respuesta, no decoración.
- **Do** mantener el contraste de texto sobre fondo ≥ 4.5:1 (WCAG 2.1 AA). La tinta suave (#3A4163) sobre lienzo (#F4F6FB) da ~6.5:1.
- **Do** usar la jerarquía tipográfica explícita: Display → Headline → Title → Body → Label. Saltarse niveles confunde al operador.

### Don't:
- **Don't** usar software ISP legacy como referencia visual. Sin fondos densos, bordes excesivos, tablas apretadas, ni iconografía inconsistente.
- **Don't** añadir modos oscuro/claro toggle. El shell oscuro + contenido claro es la identidad, no una opción.
- **Don't** usar sombras múltiples en un mismo elemento. Una sombra por nivel de elevación.
- **Don't** usar tracking positivo en cabeceras. Bricolage Grotesque está diseñado para tracking negativo o neutro en display.
- **Don't** superponer más de dos niveles de elevación visibles simultáneamente (modal sobre cards sobre canvas está bien; modal sobre dropdown sobre cards sobre canvas ya es ruido visual).
- **Don't** usar bordes mayores de 1px como acento decorativo. La estructura es explícita pero no ruidosa.
