/**
 * Script: extract_chatwoot_training.ts
 * Propósito: Extrae conversaciones de Chatwoot y genera archivos de entrenamiento
 *            para un agente IA (formato OpenAI fine-tuning JSONL + resumen legible).
 *
 * Uso:
 *   cd backend
 *   CHATWOOT_TOKEN=tu_token_aqui ts-node --transpile-only scripts/extract_chatwoot_training.ts
 *
 * Archivos generados en /tmp/:
 *   - chatwoot_training.jsonl   → Para fine-tuning en OpenAI
 *   - chatwoot_qa_pairs.json    → Pares Q&A para revisar manualmente
 *   - chatwoot_summary.txt      → Estadísticas del proceso
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ─── Configuración ────────────────────────────────────────────────────────────
const CHATWOOT_URL   = process.env.CHATWOOT_URL   || 'http://localhost:3000';
const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN || 'kVFWDgHMUHTwH8pMR1ixbyBZ';
const ACCOUNT_ID     = process.env.CHATWOOT_ACCOUNT || '1';
const OUTPUT_DIR     = path.join(__dirname, '..', '..', 'tmp');

const SYSTEM_PROMPT = `Eres un agente de soporte al cliente de IMV (proveedor de internet). 
Tu función es responder preguntas sobre pagos, saldos pendientes, fallas de servicio, instalaciones 
y planes de internet. Sé amable, claro y conciso. Siempre en español colombiano.`;

// Tipos de mensaje a ignorar (bots, notas internas, notificaciones automáticas)
const BOT_KEYWORDS = [
    'recordatorio de pago', 'mensaje automático', 'bot:', 'sistema:', 
    'pago registrado exitosamente', 'su pago fue', 'notificación:'
];
// ─────────────────────────────────────────────────────────────────────────────

interface ChatwootMessage {
    id: number;
    content: string;
    message_type: number; // 0=incoming(cliente), 1=outgoing(agente), 2=activity, 3=template
    created_at: number;
    sender?: { name: string; type: string };
    private: boolean;
}

interface ChatwootConversation {
    id: number;
    status: string;
    meta: { sender: { name: string; phone_number: string } };
}

interface QAPair {
    conversationId: number;
    clientPhone?: string;
    question: string;
    answer: string;
}

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface TrainingEntry {
    messages: OpenAIMessage[];
}

const api = axios.create({
    baseURL: `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}`,
    headers: { api_access_token: CHATWOOT_TOKEN },
    timeout: 15000,
});

function isAutomatedMessage(content: string): boolean {
    if (!content) return true;
    const lower = content.toLowerCase();
    return BOT_KEYWORDS.some(kw => lower.includes(kw));
}

function cleanContent(content: string): string {
    return content
        .replace(/\*([^*]+)\*/g, '$1')   // quitar negritas markdown
        .replace(/\n{3,}/g, '\n\n')       // máximo 2 saltos de línea
        .trim();
}

async function fetchAllConversations(): Promise<ChatwootConversation[]> {
    const conversations: ChatwootConversation[] = [];
    let page = 1;
    
    console.log('📥 Descargando conversaciones...');
    
    while (true) {
        const res = await api.get('/conversations', {
            params: { page, status: 'resolved' }
        });
        
        const items = res.data?.data?.payload || [];
        if (items.length === 0) break;
        
        conversations.push(...items);
        console.log(`   Página ${page}: ${items.length} conversaciones (total: ${conversations.length})`);
        page++;
        
        if (items.length < 25) break; // última página
    }
    
    // También traer conversaciones abiertas
    page = 1;
    while (true) {
        const res = await api.get('/conversations', {
            params: { page, status: 'open' }
        });
        const items = res.data?.data?.payload || [];
        if (items.length === 0) break;
        conversations.push(...items);
        page++;
        if (items.length < 25) break;
    }
    
    return conversations;
}

async function fetchMessages(conversationId: number): Promise<ChatwootMessage[]> {
    try {
        const res = await api.get(`/conversations/${conversationId}/messages`);
        return res.data?.payload || [];
    } catch {
        return [];
    }
}

function buildQAPairs(
    messages: ChatwootMessage[],
    conversationId: number,
    phone?: string
): QAPair[] {
    const pairs: QAPair[] = [];
    
    // Ordenar por tiempo
    const sorted = messages
        .filter(m => !m.private)               // excluir notas privadas
        .filter(m => m.message_type !== 2)     // excluir actividades del sistema
        .filter(m => m.content?.trim())        // excluir vacíos
        .filter(m => !isAutomatedMessage(m.content))
        .sort((a, b) => a.created_at - b.created_at);
    
    // Agrupar: mensaje cliente (type=0) seguido de respuesta agente (type=1)
    for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next    = sorted[i + 1];
        
        if (current.message_type === 0 && next.message_type === 1) {
            const question = cleanContent(current.content);
            const answer   = cleanContent(next.content);
            
            // Filtrar pares muy cortos o sin valor
            if (question.length < 5 || answer.length < 10) continue;
            
            pairs.push({ conversationId, clientPhone: phone, question, answer });
        }
    }
    
    return pairs;
}

function buildTrainingEntry(pairs: QAPair[]): TrainingEntry | null {
    if (pairs.length === 0) return null;
    
    const messages: OpenAIMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT }
    ];
    
    for (const pair of pairs) {
        messages.push({ role: 'user',      content: pair.question });
        messages.push({ role: 'assistant', content: pair.answer   });
    }
    
    return { messages };
}

async function main() {
    if (!CHATWOOT_TOKEN) {
        console.error('❌ Falta CHATWOOT_TOKEN. Ejecuta:\n   CHATWOOT_TOKEN=tu_token ts-node scripts/extract_chatwoot_training.ts');
        process.exit(1);
    }
    
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    
    // 1. Descargar conversaciones
    const conversations = await fetchAllConversations();
    console.log(`\n✅ Total conversaciones encontradas: ${conversations.length}`);
    
    const allPairs:     QAPair[]        = [];
    const trainingData: TrainingEntry[] = [];
    
    let processed = 0;
    let skipped   = 0;
    
    // 2. Procesar cada conversación
    for (const conv of conversations) {
        const phone    = conv.meta?.sender?.phone_number;
        const messages = await fetchMessages(conv.id);
        
        const pairs = buildQAPairs(messages, conv.id, phone || undefined);
        
        if (pairs.length === 0) {
            skipped++;
            continue;
        }
        
        allPairs.push(...pairs);
        
        const entry = buildTrainingEntry(pairs);
        if (entry) trainingData.push(entry);
        
        processed++;
        process.stdout.write(`\r   Procesadas: ${processed} | Sin pares útiles: ${skipped}`);
        
        // Pequeña pausa para no saturar la API
        await new Promise(r => setTimeout(r, 100));
    }
    
    console.log('\n');
    
    // 3. Eliminar duplicados exactos (misma pregunta/respuesta)
    const seen   = new Set<string>();
    const unique = allPairs.filter(p => {
        const key = `${p.question}|||${p.answer}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    
    // 4. Guardar archivos
    const jsonlPath   = path.join(OUTPUT_DIR, 'chatwoot_training.jsonl');
    const qaPairsPath = path.join(OUTPUT_DIR, 'chatwoot_qa_pairs.json');
    const summaryPath = path.join(OUTPUT_DIR, 'chatwoot_summary.txt');
    
    // JSONL para OpenAI fine-tuning
    const jsonlLines = trainingData.map(e => JSON.stringify(e)).join('\n');
    fs.writeFileSync(jsonlPath, jsonlLines, 'utf8');
    
    // Q&A legible para revisión manual
    fs.writeFileSync(qaPairsPath, JSON.stringify(unique, null, 2), 'utf8');
    
    // Resumen
    const summary = `
RESUMEN DE EXTRACCIÓN - IMV Chatwoot Training Data
====================================================
Fecha:                  ${new Date().toLocaleString('es-CO')}
Conversaciones totales: ${conversations.length}
Conversaciones útiles:  ${processed}
Conversaciones vacías:  ${skipped}
Pares Q&A totales:      ${allPairs.length}
Pares Q&A únicos:       ${unique.length}
Entradas de training:   ${trainingData.length}

ARCHIVOS GENERADOS:
  ${jsonlPath}      → Subir a OpenAI para fine-tuning
  ${qaPairsPath}    → Revisar manualmente antes de subir
  ${summaryPath}    → Este resumen

PRÓXIMOS PASOS:
  1. Revisar chatwoot_qa_pairs.json y eliminar respuestas incorrectas
  2. Si usas OpenAI fine-tuning:
       openai api fine_tuning.jobs.create -t chatwoot_training.jsonl -m gpt-4o-mini
  3. Si usas n8n + OpenAI Assistant:
       - Sube el archivo JSONL como "knowledge" del Assistant
       - O usa el JSON de pares Q&A para crear un vector store
`.trim();
    
    fs.writeFileSync(summaryPath, summary, 'utf8');
    
    console.log('─'.repeat(55));
    console.log(summary);
    console.log('─'.repeat(55));
    console.log('\n✅ Extracción completada.');
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    if (err.response) {
        console.error('   HTTP Status:', err.response.status);
        console.error('   Respuesta:', JSON.stringify(err.response.data).slice(0, 300));
    }
    process.exit(1);
});
