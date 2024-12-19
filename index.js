/**
  * Base Ori Created By MannR
  * Name Script : mp
  * Creator Script : MannR
  * Version Script : 1.2.5
  * Libary : @whiskeysockets/baileys
  * Version Libary : ^6.6.0
  * Created on Sunday, Sep 1, 2024
  * Updated on Sunday, Dec 15, 2024
  * Thank you to MannR and the module providers and those who use this base.
  * Please use this base as best as possible and do not delete the copyright.
  * © MannR 2024
**/

require('./lib/config.js')
const { Boom } = require('@hapi/boom')
const { baileys, chalk, fs, pino, readline, process, PhoneNumber } = require("./lib/module");
const { default: makeConnectionmp, DisconnectReason, useMultiFileAuthState, makeInMemoryStore, jidDecode, generateForwardMessageContent, downloadContentFromMessage, generateWAMessageFromContent, proto } = baileys
const CFonts = require('cfonts');
const { Sticker } = require("wa-sticker-formatter");

let useOfPairing = true

function question(q) {
    let y = readline.createInterface({
    input: process.stdin,
    output: process.stdout
    });
    return new Promise((resolve) => {
    y.question(q, resolve)
    });
};

let store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' })})

async function whatsappConnect() {
    let { state, saveCreds } = await useMultiFileAuthState("all/connect")
    var mp = makeConnectionmp({
    printQRInterminal: !useOfPairing,
    browser: ["Linux", "Safari", ""],
    logger: pino({ level: "silent" }),
    auth: state
    })
    
    if (useOfPairing && !mp.authState.creds.registered) {
        var number = await question('input your number whatsapp:\n')
        var code = await mp.requestPairingCode(number.trim())
        console.log(chalk.bold.white('code:' + code))
    }
    
    // mp.welcome = "Halo @user selamat datang"
    // mp.leave = "Selamat tinggal @user"
    // mp.promote = "Selamat @user dipromote"
    // mp.demote = "Yahh @user didemote"
    
    mp.public = true
    
    mp.ai_sessions = mp.ai_sessions ? mp.ai_sessions : {};
    
    mp.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode
        if (reason === DisconnectReason.badSession) {
        console.log(`Bad Session File, Please Delete Session and Scan Again`);
        mp.logout();
        } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, reconnecting...."); whatsappConnect();
        } else if (reason === DisconnectReason.connectionLost) { 
        console.log("Connection Lost from Server, reconnecting..."); 
        whatsappConnect();
        } else if (reason === DisconnectReason.connectionReplaced) {
        console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First")
        mp.logout();
        } else if (reason === DisconnectReason.loggedOut) {
        console.log(`Device Logged Out, Please Scan Again And Run.`);
        mp.logout();
        } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required, Restarting...");
        whatsappConnect();
        } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection TimedOut, Reconnecting...");
        whatsappConnect();
        } else mp.end(`Unknown DisconnectReason: ${reason}|${connection}`)
        } else if (connection === "open") { 
        CFonts.say('mp', {
            font: 'simple', // Pilih salah satu font yang tersedia
            align: 'left', // Posisi teks
            colors: ['cyanBright', 'magentaBright'], // Warna teks
            background: 'transparent', // Warna background
            letterSpacing: 1, // Jarak antar huruf
            lineHeight: 2, // Tinggi baris
            space: true, // Spasi antar karakter
            maxLength: '0' // Panjang maksimal
        });
        console.log(chalk.bold.white("Simple WhatsApp bot")) // Hargailah yang create jangan ditempel² weem anj
        }
    console.log('Connected...', update)
    })
    
    mp.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m) return;
        const messageHandler = await require('./mp.js');
        messageHandler(mp, m);
    });
    
    mp.ev.on('group-participants.update', async (nu) => {
        console.log(nu);
        try {
        let { id, participants, action } = nu
        var metadata = await mp.groupMetadata(id);
        
        for (let n of participants) {
            try {
            ppser = await mp.profilePicture(n, 'image');
            } catch (e) {
            ppser = 'https://telegra.ph/file/68d47ac90bcc8ef1510fa.jpg';
            }
            
            switch (action) {
             case 'add':
             case 'remove': {
                var t = mp.welcome.replace("user", n.split("@")[0])
                var t2 = mp.leave.replace("user", n.split("@")[0])
                mp.sendMessage(id, { text: (action === 'add' ? t : t2) }, { contextInfo: { mentionedJid: [n], externalAdReply: { title: action === 'add' ? 'Welcome' : 'Goodbye', body: "© Created by MannR", thumbnailUrl: ppser, mediaType: 3, renderLargerThumbnail: false }}, mentions: [n] },{})
             }
             break;
             case 'promote': {
                var u = mp.promote.replace("user", n.split("@")[0])
                mp.sendMessage(id, { text: u }, { contextInfo: { mentionedJid: [n], externalAdReply: { title: '', body: "© Created by MannR", thumbnailUrl: ppser, mediaType: 3, renderLargerThumbnail: false }}, mentions: [n] },{})
             }
             break;
             case 'demote': {
                var x = mp.demote.replace("user", n.split("@")[0])
                mp.sendMessage(id, { text: u }, { contextInfo: { mentionedJid: [n], externalAdReply: { title: '', body: "© Created by MannR", thumbnailUrl: ppser, mediaType: 3, renderLargerThumbnail: false }}, mentions: [n] },{})
             }
             break;
            }
            
        }
        } catch (e) {
        console.log(e);
        }
    });
    
    
    mp.ev.on('creds.update', await saveCreds);
    
    mp.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {}
        return decode.user && decode.server && decode.user + '@' + decode.server || jid
    } else return jid
    }
    
    mp.sendImageAsSticker = async (jid, imageBuffer, yaya) => {
    const sticker = new Sticker(imageBuffer, yaya)
    const stickerBuffer = await sticker.toBuffer()
    mp.sendMessage(jid, { sticker: stickerBuffer })
    }
    
    mp.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || ''
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
    const stream = await downloadContentFromMessage(message, messageType)
    let buffer = Buffer.from([])
    for await(const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])}
    return buffer
    }
    
    mp.copyNForward = async (jid, message, forceForward = false, options = {}) => {
    let vtype
    if (options.readViewOnce) {
        message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
        vtype = Object.keys(message.message.viewOnceMessage.message)[0]
        delete (message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
        delete message.message.viewOnceMessage.message[vtype].viewOnce
        message.message = {
            ...message.message.viewOnceMessage.message
        }
    }
    let mtype = Object.keys(message.message)[0]
    let content = await generateForwardMessageContent(message, forceForward)
    let ctype = Object.keys(content)[0]
    let context = {}
    if (mtype != "conversation") context = message.message[mtype].contextInfo
    content[ctype].contextInfo = {
        ...context,
        ...content[ctype].contextInfo
    }
    const waMessage = await generateWAMessageFromContent(jid, content, options ? {
        ...content[ctype],
        ...options,
        ...(options.contextInfo ? {
            contextInfo: {
                ...content[ctype].contextInfo,
                ...options.contextInfo
            }
        } : {})
    } : {})
    await mp.relayMessage(jid, waMessage.message, { messageId:  waMessage.key.id })
    return waMessage
    }
    
    /** mp.sendButton = async (jid, text, btn) => {
    let msg = generateWAMessageFromContent(jid, { viewOnceMessage: {
        message: { 
            "messageContextInfo": { 
            "deviceListMetadata": {}, 
            "deviceListMetadataVersion": 2
        }, 
        interactiveMessage: proto.Message.InteractiveMessage.create({
        contextInfo: { 
            mentionedJid: [jid] 
        },
        body: proto.Message.InteractiveMessage.Body.create({ 
            text: text
        }), 
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ 
        buttons: btn
        })
        })}
        }}, { userJid: jid, quoted: m })
        await mp.relayMessage(msg.key.remoteJid, msg.message, { 
        messageId: msg.key.id 
        })
    } **/
    
    return mp;
}

whatsappConnect();

process.on('uncaughtExceptopn', function (e) {
    console.log('Caught exception', e);
})