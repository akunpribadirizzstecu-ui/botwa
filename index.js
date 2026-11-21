const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Koneksi putus, reconnect...', shouldReconnect);
      if (shouldReconnect) start();
    } else if (connection === 'open') {
      console.log('✅ BOT UDAH NYAMBUNG KE WA!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';

    if (text.toLowerCase() === '.ping') {
      await sock.sendMessage(from, { text: 'Pong! Bot aktif ✅' });
    }
    if (text.toLowerCase() === '.menu') {
      await sock.sendMessage(from, { text: '🤖 MENU BOT\n\n.ping - cek bot\n.menu - liat menu\n.halo - sapa bot' });
    }
    if (text.toLowerCase() === '.halo') {
      await sock.sendMessage(from, { text: 'Halo juga! Gue bot lu 😎' });
    }
  });
}
start();
