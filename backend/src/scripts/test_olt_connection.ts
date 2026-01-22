import { Client } from 'ssh2';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    host: process.env.OLT_HOST || '192.168.100.1',
    port: parseInt(process.env.OLT_PORT || '22'),
    username: process.env.OLT_USER || 'admin',
    password: process.env.OLT_PASSWORD || ''
};

console.log(`Intentando conectar (modo Shell) a ${config.host} como ${config.username}...`);

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conexión SSH establecida.');

    conn.shell((err, stream) => {
        if (err) {
            console.error('❌ Error abriendo shell:', err);
            conn.end();
            return;
        }

        let output = '';

        stream.on('close', () => {
            console.log('--- Sesión Shell cerrada ---');
            conn.end();
        }).on('data', (data: any) => {
            const text = data.toString();
            output += text;
            process.stdout.write(text); // Mostrar en tiempo real
        });

        // Secuencia de comandos
        // 1. Esperamos un poco para recibir el banner/prompt inicial
        setTimeout(() => {
            console.log('\n📝 Enviando comando: display version');
            stream.write('display version\n');
        }, 2000);

        // 2. Cerramos después de recibir respuesta
        setTimeout(() => {
            console.log('\n👋 Cerrando conexión...');
            stream.end(); 
            // conn.end(); // A veces es necesario forzar el cierre del cliente
        }, 5000);
    });

}).on('error', (err) => {
    console.error('❌ Error de conexión:', err);
}).on('end', () => {
    console.log('🔌 Desconectado.');
}).connect({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    algorithms: {
        kex: ['diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc', '3des-cbc', 'aes256-cbc']
    }
});
