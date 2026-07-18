/**
 * Script: clean_chatwoot_training.ts
 * Propósito: Limpia y filtra chatwoot_qa_pairs.json eliminando pares de baja
 *            calidad para dejar solo intercambios útiles de entrenamiento.
 *
 * Uso:
 *   cd backend
 *   ./node_modules/.bin/ts-node --transpile-only scripts/clean_chatwoot_training.ts
 *
 * Genera:
 *   /tmp/chatwoot_qa_pairs_clean.json   → Pares filtrados para revisión
 *   /tmp/chatwoot_training_clean.jsonl  → Archivo limpio para OpenAI
 *   /tmp/chatwoot_rejected.json         → Pares descartados (para auditar)
 */

import * as fs from 'fs';
import * as path from 'path';

const TMP_DIR     = path.join(__dirname, '..', '..', 'tmp');
const INPUT_FILE  = path.join(TMP_DIR, 'chatwoot_qa_pairs.json');
const OUTPUT_CLEAN_JSON  = path.join(TMP_DIR, 'chatwoot_qa_pairs_clean.json');
const OUTPUT_CLEAN_JSONL = path.join(TMP_DIR, 'chatwoot_training_clean.jsonl');
const OUTPUT_REJECTED    = path.join(TMP_DIR, 'chatwoot_rejected.json');

const SYSTEM_PROMPT = `Eres un agente de soporte al cliente de IMV Internet (proveedor de internet por fibra óptica en Colombia).
Tu función es responder preguntas sobre pagos, saldos pendientes, fallas de servicio, instalaciones, planes de internet y soporte técnico.
Sé amable, claro y conciso. Siempre en español colombiano.
Medios de pago aceptados: Nequi (@NEQUIALV966) y cuenta Bancolombia 912-478680-17 a nombre de Alvaro Andrés Zambrano.`;

interface QAPair {
    conversationId: number;
    clientPhone?: string;
    question: string;
    answer: string;
}

// ─── Palabras que indican un par de baja calidad ─────────────────────────────

// Frases que por sí solas no aportan información
const NOISE_PHRASES = [
    'buenas tardes', 'buenos días', 'buenas noches', 'buen dia', 'buen día',
    'hola', 'ok', 'gracias', 'muchas gracias', 'te agradezco', 'mil gracias',
    'listo', 'listo gracias', 'perfecto', 'vale', 'claro', 'entendido',
    'hasta luego', 'hasta pronto', 'nos vemos', 'chao', 'adiós',
    'si señor', 'si señora', 'ok gracias', 'dale', 'ya', 'ok listo',
    'genial', 'excelente', 'de nada', 'con gusto', 'bien gracias',
    'jajaja', 'jaja', '👍', '😊', '☺️', '🙏', '✅'
];

// Palabras que indican mensajes de negocios ajenos o spam
const OFF_TOPIC_KEYWORDS = [
    'bethconcept', 'vestido', 'meli te responderá', 'fuera de nuestro horario de atención',
    'compra en cualquier momento', 'tu vestido', 'www.beth', 'zudotex', 'cuenta compartida', 
    'la bodeguita', 'teqmall', 'sede sur', 'este mensaje se ha eliminado'
];

// Palabras clave de mensajes automáticos de recordatorio o bot
const BOT_PATTERNS = [
    'su factura de imv internet del mes de',
    'fecha límite de pago:',
    'medios de pago:',
    'envíe el comprobante de pago por este whatsapp',
    'si ya realizó el pago, ignore este mensaje',
    'recordatorio de pago',
    'estimado cliente',
    'atentamente,',
    // Mensaje de suspensión urgente automático
    'urgente: servicio será suspendido',
    'será *suspendido* por falta de pago',
    // Mensaje de bienvenida automático del bot
    'gracias por comunicarte con imv internet. ¿cómo podemos ayudarte?',
    'gracias por comunicarte con imv internet',
];

// ─── Funciones de filtrado ────────────────────────────────────────────────────

function normalize(text: string): string {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
        .replace(/[!?.,:;*_~`]/g, '')
        .trim();
}

function isNoise(text: string): boolean {
    const n = normalize(text);
    // Exactamente una frase de ruido
    if (NOISE_PHRASES.some(p => n === normalize(p))) return true;
    // Muy corto (menos de 4 palabras) y no contiene info útil
    const words = n.split(/\s+/).filter(Boolean);
    if (words.length <= 3) return true;
    return false;
}

function isOffTopic(text: string): boolean {
    const lower = text.toLowerCase();
    return OFF_TOPIC_KEYWORDS.some(kw => lower.includes(kw));
}

function isBotMessage(text: string): boolean {
    const lower = text.toLowerCase();
    return BOT_PATTERNS.some(p => lower.includes(p));
}

function hasMinimumInfo(question: string, answer: string): boolean {
    const qWords = question.trim().split(/\s+/).length;
    const aWords = answer.trim().split(/\s+/).length;
    // La respuesta debe tener al menos 5 palabras para ser útil
    if (aWords < 5) return false;
    // La pregunta debe tener al menos 3 palabras
    if (qWords < 3) return false;
    return true;
}

function isUseful(pair: QAPair): { ok: boolean; reason?: string } {
    const { question, answer } = pair;

    if (isOffTopic(question) || isOffTopic(answer)) {
        return { ok: false, reason: 'off_topic (negocio ajeno)' };
    }
    if (isBotMessage(question)) {
        return { ok: false, reason: 'pregunta_es_mensaje_bot' };
    }
    if (isBotMessage(answer)) {
        return { ok: false, reason: 'respuesta_es_mensaje_bot' };
    }
    if (isNoise(question)) {
        return { ok: false, reason: 'pregunta_ruido (saludo/gracias vacío)' };
    }
    if (isNoise(answer)) {
        return { ok: false, reason: 'respuesta_ruido (muy corta/sin info)' };
    }
    if (!hasMinimumInfo(question, answer)) {
        return { ok: false, reason: 'par_muy_corto' };
    }

    return { ok: true };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ No se encontró: ${INPUT_FILE}`);
        console.error('   Ejecuta primero: extract_chatwoot_training.ts');
        process.exit(1);
    }

    const pairs: QAPair[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`📂 Pares cargados: ${pairs.length}`);

    const clean:    QAPair[] = [];
    const rejected: Array<QAPair & { reason: string }> = [];

    for (const pair of pairs) {
        const result = isUseful(pair);
        if (result.ok) {
            clean.push(pair);
        } else {
            rejected.push({ ...pair, reason: result.reason! });
        }
    }

    // Eliminar duplicados exactos que puedan quedar
    const seen = new Set<string>();
    const uniqueClean = clean.filter(p => {
        const key = `${normalize(p.question)}|||${normalize(p.answer)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Agrupar por conversación para el JSONL (contexto por hilo)
    const byConversation = new Map<number, QAPair[]>();
    for (const pair of uniqueClean) {
        if (!byConversation.has(pair.conversationId)) {
            byConversation.set(pair.conversationId, []);
        }
        byConversation.get(pair.conversationId)!.push(pair);
    }

    // Construir JSONL con contexto de conversación completa
    const jsonlLines: string[] = [];
    for (const [, convPairs] of byConversation) {
        const messages: Array<{ role: string; content: string }> = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];
        for (const p of convPairs) {
            messages.push({ role: 'user',      content: p.question });
            messages.push({ role: 'assistant', content: p.answer   });
        }
        jsonlLines.push(JSON.stringify({ messages }));
    }

    // Guardar archivos
    fs.writeFileSync(OUTPUT_CLEAN_JSON,  JSON.stringify(uniqueClean, null, 2), 'utf8');
    fs.writeFileSync(OUTPUT_CLEAN_JSONL, jsonlLines.join('\n'),                'utf8');
    fs.writeFileSync(OUTPUT_REJECTED,    JSON.stringify(rejected, null, 2),    'utf8');

    // Estadísticas por razón de rechazo
    const reasons = rejected.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('\n' + '─'.repeat(55));
    console.log('RESUMEN DE LIMPIEZA');
    console.log('─'.repeat(55));
    console.log(`Total de entrada:       ${pairs.length}`);
    console.log(`✅ Pares útiles:        ${uniqueClean.length}`);
    console.log(`❌ Pares descartados:   ${rejected.length}`);
    console.log(`📦 Entradas JSONL:      ${jsonlLines.length} (agrupadas por conversación)`);
    console.log('\nRazones de rechazo:');
    for (const [reason, count] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${count.toString().padStart(3)}x  ${reason}`);
    }
    console.log('\nArchivos generados:');
    console.log(`  ${OUTPUT_CLEAN_JSON}`);
    console.log(`  ${OUTPUT_CLEAN_JSONL}`);
    console.log(`  ${OUTPUT_REJECTED}  ← Revisa este para ver qué se eliminó`);
    console.log('─'.repeat(55));
}

main();
