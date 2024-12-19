require("./lib/config.js")
var { axios, JavaScriptObfuscator, fetch, fs, chalk, baileys, execSync, util, path } = require("./lib/module.js")
var { watchFile, unwatchFile, readFileSync } = fs
var { generateWAMessageContent, generateWAMessageFromContent, getContentType, proto } = baileys
let cp = execSync
let { promisify } = util
let exec = promisify(cp.exec).bind(cp)

module.exports = async (mp, m) => {
    try {
    let Read = async (mp, jid, messageId) => {
        await mp.readMessages([{ remoteJid: jid, id: messageId, participant: null }]);
    }
    
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = mp.decodeJid(m.fromMe && mp.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = mp.decodeJid(m.key.participant) || ''
    }
    
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        if (m.quoted) {
            let type = getContentType(quoted)
			m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
				type = getContentType(m.quoted)
				m.quoted = m.quoted[type]
			}
            if (typeof m.quoted === 'string') m.quoted = {
				text: m.quoted
			}
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
			m.quoted.sender = mp.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === (mp.user && mp.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })

            m.quoted.delete = () => mp.sendMessage(m.quoted.chat, { delete: vM.key })

            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => mp.copyNForward(jid, vM, forceForward, options)

            m.quoted.download = () => mp.downloadMediaMessage(m.quoted)
        }
    }
    if (m.msg.url) m.download = () => mp.downloadMediaMessage(m.msg)
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''

	m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => mp.copyNForward(jid, m, forceForward, options)
	
    const message = m.message;
    const isGroup = m.key.remoteJid.endsWith('@g.us');
    const isName = m.pushName || 'no name';
    const isFrom = m.key.remoteJid;
    const isSender = isGroup ? (m.key.participant ? m.key.participant : m.participant) : m.key.remoteJid;
    const isOwner = global.owner.includes(isSender);
    const groupMetadata = isGroup ? await mp.groupMetadata(isFrom) : {}; 
    
    const participants = isGroup ? groupMetadata.participants : '';
    const groupName = isGroup ? groupMetadata.subject : '';
    const groupAdmins = m.isGroup ? await participants.filter(v => v.admin !== null).map(v => v.id) : '';
    const isBotAdmins = m.isGroup ? groupAdmins.includes(mp.user.jid) : false
    const isAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false

    let mType = Object.keys(message)[0];
    let body = (mType === 'conversation' && message.conversation) ? message.conversation :
               (mType === 'extendedTextMessage' && message.extendedTextMessage.text) ? message.extendedTextMessage.text :
               (mType === 'imageMessage' && message.imageMessage.caption) ? message.imageMessage.caption :
               (mType === 'videoMessage' && message.videoMessage.caption) ? message.videoMessage.caption :
               (mType === 'buttonsResponseMessage') ? message.buttonsResponseMessage.selectedButtonId :
               (mType === 'listResponseMessage') ? message.listResponseMessage.singleSelectReply.selectedRowId :
               (mType === 'templateButtonReplyMessage') ? message.templateButtonReplyMessage.selectedId :
               (mType === 'messageContextInfo') ? (message.buttonsResponseMessage?.selectedButtonId || message.listResponseMessage?.singleSelectReply.selectedRowId || message.text) :
               (mType === 'documentMessage' && message.documentMessage.caption) ? message.documentMessage.caption : '';

    const prefix = ['$', ''];
    const args = body.trim().split(/ +/).slice(1);
    const text = args.join(' ');
    if (!prefix.some(p => body.startsWith(p))) return;
    // if (m.fromMe) return m.react('🤡');
    // if (m.isGroup && !isBotAdmins) return;
    if (m.isGroup && !groupName.toLowerCase().includes('ciko') && !groupName.toLowerCase().includes('project') && !groupName.toLowerCase().includes('boti')) return;
    
 
// if (!(groupName.toLowerCase().includes('project') || groupName.toLowerCase().includes('ciko')) && `m.isGroup) return;

    const [command] = body.slice(prefix.find(p => body.startsWith(p)).length).trim().split(/ +/);
    
    var cmd = prefix + command

    await Read(mp, m.key.remoteJid, m.key.id);
    
    let x = chalk.bold.cyan("[ Message mp ]");
    x += chalk.cyan("\nᕐ⁠ᐷ From: ")
    x += chalk.bold.white(isSender)
    x += chalk.cyan("\nᕐ⁠ᐷ Command: ")
    x += chalk.bold.white(command + " " + text)
    console.log(x)
        m.reply = async (text) => {
            let { id, name } = await mp.user
            let z = await mp.profilePictureUrl(id, "image")
            mp.sendMessage(m.key.remoteJid, {
                text: text, contextInfo: {
                    forwardingScore: 0,
                    isForwarded: false, //untuk menyembunyikan tombol forward ke channel lain menggunakan ID
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "12345678987654323456789@newsletter",
                        serverMessageId: 0,
                        newsletterName: "mp"
                    },
                    mentionedJid: [m.sender],
                    externalAdReply: {
                        showAdAttribution: false,
                        mediaUrl: "https://mpdev.my.id",
                        description: "https://mpdev.my.id",
                    
                        title: 'di balas oleh BOT',
                        // title: name,
                        body: "- medibot",
                        
                        thumbnailUrl: z,
                        sourceUrl: "https://mpdev.my.id",
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        
                    }
                }
            }, { quoted: m })
        };
        m.react = (q) => {
            mp.sendMessage(m.chat, { react: { text: q, key: m.key } })
        }
        m.upTime = () => {
            let ms = require("process").uptime() * 1000
            let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
            let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
            let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
            return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
        }
        mp.sendButton = async (jid, text, btn) => {
            let msg = generateWAMessageFromContent(jid, {
                viewOnceMessage: {
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
                        })
                    }
                }
            }, { userJid: jid, quoted: m })
            await mp.relayMessage(msg.key.remoteJid, msg.message, {
                messageId: msg.key.id
            })
        }
        function format(views) {
            if (views >= 1000000) {
                return (views / 1000000).toFixed(1) + 'M';
            } else if (views >= 1000) {
                return (views / 1000).toFixed(1) + 'K';
            } else {
                return views.toString();
            }
        }

        // dari grup
        // import axios from 'axios'
        // export default (handler) => {
        //   handler.reg({
        //     cmd: ['lumin', 'luminai'],
        //     tags: 'ai',
        //     desc: 'Lumin AI',
        //     isLimit: true,
        //     run: async (m, { sock }) => {
        //       // Fungsi untuk mengirim request ke API
        //       async function fetchUser(content, imageBuffer = null, user) {
        //         try {
        //           const payload = { content, user }
        //           if (imageBuffer) {
        //             payload.imageBuffer = imageBuffer
        //           }

        //           const response = await axios.post('https://luminai.my.id/', payload)
        //           return response.data.result
        //         } catch (error) {
        //           return error
        //         }
        //       }

        //       try {
        //         const quoted = m.quoted || {}
        //         const mime = (quoted.msg || {}).mimetype || ''
        //         const content = m.text?.trim() || (quoted.body || '').trim()
        //         const userId = m.sender

        //         if (/image/.test(mime)) {
        //           // Jika pesan memiliki gambar
        //           const media = await sock.downloadMediaMessage(quoted)
        //           if (!media) {
        //             return m.reply('❌ Gagal mengunduh gambar. Pastikan Anda membalas gambar yang valid.')
        //           }
        //           const result = await fetchUser(content || 'Analisis gambar ini', media, userId)
        //           const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : result
        //           return m.reply(output)
        //         } else if (content) {
        //           // Jika hanya teks
        //           const result = await fetchUser(content, null, userId)
        //           const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : result
        //           return m.reply(output)
        //         } else {
        //           // Jika tidak ada input yang valid
        //           return m.reply('❌ Silahkan masukan pertanyaan atau kirim gambar.\nContoh: $$med2 siapa kamu')
        //         }
        //       } catch (error) {
        //         return error
        //       }
        //     },
        //   })
        // }

        // const quoted = m && (m.quoted || m);


        const sendPlay = async (text) => {
    if (!text) return m.reply("Masukan judul!");
    try {
        const searchResponse = await axios.get("https://mannoffc-x.hf.space/search/spotify", { params: { s: text } });
        const { name, artists, link, image, duration_ms } = searchResponse.data.result[0];

        const downloadResponse = await axios.get("https://mannoffc-x.hf.space/download/spotify", { params: { url: link } });
        const { download } = downloadResponse.data.result;

        m.react("🎵");

        const resText = `• *Name:* ${name}\n• *Artist:* ${artists}\n• *Duration:* ${duration_ms}ms`;
        const qq = await mp.sendMessage(m.chat, { image: { url: image }, caption: resText }, { quoted: m });
        await mp.sendMessage(m.chat, { audio: { url: download }, mimetype: "audio/mpeg" }, { quoted: qq });
    } catch (e) {
        console.log(e);
        m.reply(e.message);
    }
};
           
        
        const sendTxt2img = async (text) => {
            if (!text) return m.reply("Masukan teks!")
            try {
            var { data } = await axios({
                "method": "GET",
                "url": "https://hercai.onrender.com/v3/text2image",
                "params": { "prompt": text }
            })
            mp.sendMessage(m.chat, {
            image: { url: data.url }
            }, { quoted: m })
            } catch (e) {
            m.reply(e.message)
            console.log(e)
            }
        }

        switch (command.toLowerCase()) {
            case "ai": {
                //if (!text) return m.reply(`Contoh *.ai* <on/off>`)
                if (text == "off") {
                    delete mp.ai_sessions[m.sender]
                    m.reply("Success delete session chat")
                } else if (mp.ai_sessions[m.sender]) {
                    m.reply("depannya gausah pake AI lagi, sudah aktif autonya!!!")
                } else {
                    mp.ai_sessions[m.sender] = { messages: [] }
                    m.reply("Success create session chat\n> Ketik *$ai* off untuk menghapus sessions chat.")
                }
            }
            break
            case "halo": {
                try {
                    // Mengirim data ke webhook.php
                    let { data } = await axios({
                        method: "POST",
                        url: "https://xmxp.my.id/webhook.php", // Ganti dengan URL webhook Anda
                        headers: {
                            'Content-Type': 'application/json', // Pastikan header sesuai
                        },
                        data: { // Mengirim data dengan method POST
                            message: "halo",  // Pesan yang akan diterima oleh webhook
                            from: m.sender,   // Nomor pengirim
                        }
                    });

                    // Menampilkan respons dari server
                    if (data && data.message) {
                        m.react("👌🏻");
                        m.reply(data?.message || 'bot tidak merespon'); // Mengirimkan pesan yang diterima dari webhook
                    } else {
                        m.reply("Tidak ada pesan dari server.");
                    }
                } catch (error) {
                    console.error("Error menghubungi server:", error);
                    m.reply("Terjadi kesalahan saat menghubungi server.");
                }
            }
                break;
            case "saldo": {
                try {
                    // console.log("Mengirim permintaan ke webhook...");
                    var { data } = await axios({
                        method: "POST",
                        url: "http://xmxp.my.id/webhook.php",
                        data: {
                            message: "saldo",
                            from: m.sender,
                        }
                    });
                    // console.log("Response dari webhook:", data);
                    m.react("👌🏻");
                    // m.reply(data?.message || "Respons kosong dari server.");
                    m.reply(data?.message || "bot tidak merespon")
                } catch (error) {
                    console.error("Error:", error);
                    m.reply("Terjadi kesalahan saat menghubungi server.");
                }
            }
                break;
            case "daftar": {
                // if (!text) return m.reply("Masukan nomor telepon! Contoh: *.daftar* 081234567890");
                try {
                    let { data } = await axios({
                        method: "POST",
                        url: "https://xmxp.my.id/webhook.php",
                        data: {
                            message: "daftar",
                            from: m.sender,
                        }
                    });
                    m.reply(data.message);
                    m.react("👌🏻");
                } catch ({ message }) {
                    m.reply(message);
                }
            }
                break;      
           //service instagram
           case "ig": {
               if (!text) {
                   try {
                       // Mengirim data ke webhook.php
                       let {
                           data
                       } = await axios({
                           method: "POST",
                           url: "https://xmxp.my.id/webhook.php", // Ganti dengan URL webhook Anda
                           headers: {
                               'Content-Type': 'application/json', // Pastikan header sesuai
                           },
                           data: {
                               message: "sig", // Pesan yang akan diterima oleh webhook
                               from: m.sender, // Nomor pengirim
                           }
                       });

                       // Menampilkan respons dari server
                       if (data && data.message) {
                           m.react("👌🏻");
                           m.reply(data.message); // Mengirimkan pesan yang diterima dari webhook
                       } else {
                           m.reply("Tidak ada pesan dari server.");
                       }
                   } catch (error) {
                       console.error("Error menghubungi server:", error);
                       m.reply("Terjadi kesalahan saat menghubungi server.");
                   }
               } else {
                // kalau ada parameter
                   try {
                       let {
                           data
                       } = await axios({
                           method: "POST",
                           url: "https://xmxp.my.id/webhook.php",
                           headers: {
                               'Content-Type': 'application/json',
                           },
                           data: {
                                id_service: text.split(" ")[0],
                                ig_target: text.split(" ")[1],
                                ig_qty: text.split(" ")[2],
                               message: "ig", // Pesan yang akan diterima oleh webhook
                               from: m.sender, // Nomor pengirim
                           }
                       });

                       // Menampilkan respons dari server
                       if (data && data.message) {
                        m.react("👌🏻");
                           m.reply(data.message); // Mengirimkan pesan yang diterima dari webhook
                       } else {
                           m.reply("Tidak ada pesan dari server.");
                       }
                   } catch (error) {
                       console.error("Error menghubungi server:", error);
                       m.reply("Terjadi kesalahan saat menghubungi server.");
                   }
               }
           }
           break;
           case 'brat': {
            const { createCanvas, registerFont } = require('canvas');
            const Jimp = require('jimp');
             
            async function BratGenerator(teks) {
             
              let width = 512;
              let height = 512;
              let margin = 20;
              let wordSpacing = 50; 
             
              let canvas = createCanvas(width, height);
              let ctx = canvas.getContext('2d');
             
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, width, height);
             
              let fontSize = 280;
              let lineHeightMultiplier = 1.3;
             
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              ctx.fillStyle = 'black';
             
            registerFont('./lib/Poppins-Bold.ttf', { family: 'Poppins' });
             
              let words = teks.split(' ');
              let lines = [];
             
              let rebuildLines = () => {
                lines = [];
                let currentLine = '';
             
                for (let word of words) {
                  let testLine = currentLine ? `${currentLine} ${word}` : word;
                  let lineWidth =
                    ctx.measureText(testLine).width + (currentLine.split(' ').length - 1) * wordSpacing;
             
                  if (lineWidth < width - 2 * margin) {
                    currentLine = testLine;
                  } else {
                    lines.push(currentLine);
                    currentLine = word;
                  }
                }
             
                if (currentLine) {
                  lines.push(currentLine);
                }
              };
             
              ctx.font = `${fontSize}px Narrow`;
              rebuildLines();
             
              while (lines.length * fontSize * lineHeightMultiplier > height - 2 * margin) {
                fontSize -= 2;
                ctx.font = `${fontSize}px Narrow`;
                rebuildLines();
              }
             
              let lineHeight = fontSize * lineHeightMultiplier;
              let y = margin;
             
              for (let line of lines) {
                let wordsInLine = line.split(' ');
                let x = margin;
             
                for (let word of wordsInLine) {
                  ctx.fillText(word, x, y);
                  x += ctx.measureText(word).width + wordSpacing;
                }
             
                y += lineHeight;
              }
             
              let buffer = canvas.toBuffer('image/png');
              let image = await Jimp.read(buffer);
             
              image.blur(3);
              let blurredBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
             
            return Mp.imgToSticker(m.chat, blurredBuffer, m, { packname: "mpCollect", author: "Ayam Goreng!!" })
            }
             
             
            if (!text) return m.reply(`Masukkan teks untuk stiker.\n\nContoh:\n$$brat Asik JuGa`);
             
            return BratGenerator(text)
            }
            break
           //service instagram
        //    case "fb": {
        //        if (!text) {
        //            try {
        //                // Mengirim data ke webhook.php
        //                let {
        //                    data
        //                } = await axios({
        //                    method: "POST",
        //                    url: "https://xmxp.my.id/webhook.php", // Ganti dengan URL webhook Anda
        //                    headers: {
        //                        'Content-Type': 'application/json', // Pastikan header sesuai
        //                    },
        //                    data: {
        //                        message: "sfb", // Pesan yang akan diterima oleh webhook
        //                        from: m.sender, // Nomor pengirim
        //                    }
        //                });

        //                // Menampilkan respons dari server
        //                if (data && data.message) {
        //                    m.reply(data.message); // Mengirimkan pesan yang diterima dari webhook
        //                } else {
        //                    m.reply("Tidak ada pesan dari server.");
        //                }
        //            } catch (error) {
        //                console.error("Error menghubungi server:", error);
        //                m.reply("Terjadi kesalahan saat menghubungi server.");
        //            }
        //        } else {
        //            try {
        //                let {
        //                    data
        //                } = await axios({
        //                    method: "POST",
        //                    url: "https://xmxp.my.id/webhook.php",
        //                    headers: {
        //                        'Content-Type': 'application/json',
        //                    },
        //                    data: {
        //                        message: "sfb", // Pesan yang akan diterima oleh webhook
        //                        from: m.sender, // Nomor pengirim
        //                        url: text.split(" ")[1],
        //                        target: text.split(" ")[2],
        //                    }
        //                });

        //                // Menampilkan respons dari server
        //                if (data && data.message) {
        //                    m.reply(data.message); // Mengirimkan pesan yang diterima dari webhook
        //                } else {
        //                    m.reply("Tidak ada pesan dari server.");
        //                }
        //            } catch (error) {
        //                console.error("Error menghubungi server:", error);
        //                m.reply("Terjadi kesalahan saat menghubungi server.");
        //            }
        //        }
        //    }
        //    break;
   
           
                // ini dari endpoint
            case "med": {
                m.react('😪');

                if (m.quoted && m.quoted.text ? !m.quoted.text : !text) return m.reply("ya? ada apa?")
                try {
                    var { data } = await axios({
                        "method": "GET",
                        "url": "https://mannoffc-x.hf.space/ai/logic",
                        "params": {
                            "q": m.quoted && m.quoted.text ? m.quoted.text && ( m.quoted.text|| text) : text,
                            "logic": "balas dengan bahasa jaksel pake cuk cukan yang normalnya bicara kotor"
                        }
                    })
                    m.react('🦍');
                    m.reply(data?.result || "bot tidak merespon")
                } catch (error) {
                    m.reply(error.message)
                }
            }
            break
                
            case "med2": {
                    m.react('😪');
                    let q = m.quoted ? m.quoted : m
                    let mime = (q.msg || q).mimetype || ''
                    const content = text?.trim() || (q.body || '').trim();
                    const userId = m.sender;
                
                    if (m.quoted && m.quoted.text ? !m.quoted.text : !m.text) {
                        m.react('❌');
                        return m.reply("❌ Silahkan masukan pertanyaan atau kirim gambar.\nContoh: $$med2 siapa kamu");
                    }
                
                    try {
                        if (/image/.test(mime)) {
                            m.react('😪');
                            // Jika pesan memiliki gambar
                            const media = await mp.downloadMediaMessage(q);
                            if (!media) {
                                m.react('❌');
                                return m.reply('❌ Gagal mengunduh gambar. Pastikan Anda membalas gambar yang valid.');
                            }
                
                            // Kirim request ke API dengan media
                            const { data } = await axios.post('https://luminai.my.id/', {
                                content: content || 'gambar apa ini? reply in indonesian',
                                imageBuffer: media,
                                user: userId,
                            });
                            m.react('✅');
                            
                            return m.reply(data?.result || "❌ Bot tidak merespon");
                        } else {
                            m.react('😪');
                            // Kirim request ke API dengan teks saja
                            const { data } = await axios.post('https://luminai.my.id/', {
                                content,
                                user: userId,
                            });
                            m.react('✅');
                            return m.reply(data?.result || "❌ Bot tidak merespon");
                        }
                    } catch (error) {
                        m.react('❌');
                        return m.reply(`❌ Terjadi kesalahan: ${error.message}`);
                    }
                }
                break;
                
             
                case "s": case "sticker": case "stiker": {
                    m.react('😪');
                    let q = m.quoted ? m.quoted : m
                    let mime = (q.msg || q).mimetype || ''
                    if (/image/.test(mime)) {
                    let media = await q.download()
                    m.react('✅');
                         mp.sendImageAsSticker(m.chat, media, m, { pack: "botbotan", type: "full" })
                    } else {
                        m.react('😪');
                        m.reply("Balas sebuah gambar (ga support video) dengan *$$s*")
                    }
                    }
                break

                case "tts": {
                    const content =  m.quoted && m.quoted.text ? m.quoted.text && ( m.quoted.text|| text) : text; 
                    console.log(content);
                    // Check if there is valid text input, either directly or from a quoted message
                    m.react('😪');
                    if (!content) {
                        m.react('❌');
                        return m.reply("❌ Silahkan masukan text");
                    }
                
                    try {
                        // Send the TTS request to the API with the provided text
                        const { data } = await axios({
                            url: `https://api.siputzx.my.id/api/tools/tts?text=${content.replace(/\+/g, 'plus').replace(/-/g, 'kurang').replace(/</g, 'kurang dari').replace(/>/g, 'lebih dari')}&voice=jv-ID-DimasNeural&rate=5&pitch=0&volume=1`,
                            method: 'GET',
                            responseType: 'arraybuffer', // Important to get the file as binary
                        });
                
                        if (data && Buffer.isBuffer(data)) {
                            try {
                                // Create a temporary file path for the MP3 file
                                const filePath = path.join(__dirname, 'jiancok' + '.mp3');
                                
                                // Save the binary data to a temporary MP3 file
                                fs.writeFileSync(filePath, data);
                
                                // Send the MP3 file
                                m.react('✅');
                                mp.sendMessage(m.chat, { audio: { url: filePath }, mimetype: "audio/mpeg" }, { quoted: m });     // Optionally, delete the file after sending it (to clean up)
                                // fs.unlinkSync(filePath); // Deletes the temporary file
                            } catch (error) {
                                // Handle errors
                                m.react('❌');
                                
                                console.error('Error saving or sending the audio file:', error);
                                m.reply('❌ Terjadi kesalahan saat mengirimkan audio.');
                            }
                        } else {
                            m.react('❌');
                            m.reply('❌ Tidak ada data audio yang diterima.');
                        }
                    } catch (error) {
                        // Handle errors and provide a meaningful message
                        console.error(error); // Log error for debugging purposes
                        m.react('❌');
                        return m.reply(`❌ Terjadi kesalahan: ${error.message}`);
                    }
                }
                break
                

                case "gambar": {
                    let q = m.quoted ? m.quoted : m
                    sendTxt2img(q)
                }
                break
            case "jam": {
                let date = new Date();
                let year = date.getFullYear();
                let month = date.getMonth() + 1;
                let day = date.getDate();
                let hour = date.getHours();
                let minute = date.getMinutes();
                let second = date.getSeconds();
                let x = `${day}/${month}/${year} ${hour}:${minute}:${second}`;
                m.reply(x)
            }
                break
            case "menu": {
                try {
                    let { id, name } = await mp.user
                    let c = `Hello welcome. this is WhatsApp Bot for @xmxp.my.id panel._

*FEATURE SERVICES*
> *$med2*     play with chatgpt
> *$jam*       cek waktu

> *$daftar*  daftar akun
> *$saldo*    cek saldo

*SOSMED SERVICES*
> -------------------------------
> *$ig*  cek service & order instagram
> *$fb*  cek service & order facebook
> *$x*    cek service & order twitter
> *$tt*   cek service & order tiktok
> -------------------------------
_@xmxp.my.id_`
                    let z = await mp.profilePictureUrl(id, "image")
                    mp.sendMessage(m.chat, {
                        text: c, contextInfo: {
                            forwardingScore: 0,
                            isForwarded: false, //untuk menyembunyikan tombol forward ke channel lain menggunakan ID
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "6287787244065@newsletter",
                                serverMessageId: 0,
                                newsletterName: "mp"
                            },
                            mentionedJid: [m.sender],
                            externalAdReply: {
                                showAdAttribution: true,
                                title: name,
                                body: "@google.inc",
                                thumbnailUrl: z,
                                sourceUrl: "https://google.com",
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                } catch ({ message }) {
                    return m.reply(message)
                }
            }
                break
                default:
                // let xtx = m.text.slice(0)
                let xtx = body.slice(0);
               
                // m.react('⏳');
                console.log(xtx)
                if (mp.ai_sessions[m.sender] && xtx) {
                    if (xtx.startsWith("gambarkan")) {
                        sendTxt2img(xtx.slice(9))
                    } else if (xtx.includes("buka grup")) {
                        if (!isGroup) return m.reply("Hmm cuma bisa digrup")
                        if (!isBotAdmins) return m.reply("Jadikan bot sebagai Admin grup")
                        if (!isAdmins) return m.reply("Khusus Admin")
                        mp.groupSettingsUpdate(m.chat, "announcement")
                    } else if (xtx.includes("tutup grup")) {
                        if (!isGroup) return m.reply("Hmm cuma bisa digrup")
                        if (!isBotAdmins) return m.reply("Jadikan bot sebagai Admin grup")
                        if (!isAdmins) return m.reply("Khusus Admin")
                        mp.groupSettingsUpdate(m.chat, "not_announcement")
                    } else if (xtx.startsWith("putarkan")) {
                        sendPlay(xtx.slice(8))
                    } else if (xtx.includes("matikan ai")) {
                        delete mp.ai_sessions[m.sender]
                        m.reply("✔ Success delete session chat")
                    } else {
                        const senderId = m.sender;
                        const aiSessions = mp.ai_sessions
                        const msgs = [
                            ...aiSessions[senderId].messages,
                            {
                                content: xtx,
                                role: "user"
                            }
                        ];
                        const api_url = 'https://api.manaxu.my.id/api/ai';
                        const api_key = 'key-manaxu-free';
                        axios({
                                method: 'POST',
                                url: api_url,
                                headers: {
                                    'x-api-key': api_key,
                                    'Content-Type': 'application/json'
                                },
                                data: {
                                    logic: 'nama kamu adalah mp, AI yang agak mesum yang dikit dikit ngomongin ngewean. bales pake bahasa jaksel aja biar santai, ganti bro jadi cuk. di akhir kalimat gak usah nanya apa apa',
                                    messages: msgs
                                }
                            })
                            .then(response => {
                                if (response.status === 200) {
                                    const {
                                        result
                                    } = response.data;
                                    m.reply(result ?? "error.");
                                    aiSessions[senderId].messages.push({
                                        content: xtx,
                                        role: "user"
                                    });
                                    aiSessions[senderId].messages.push({
                                        content: result,
                                        role: "assistant"
                                    });
                                    mp.ai_sessions = aiSessions;
                                } else {
                                    m.react('👨🏻');
                                    // m.reply("Hmmm sepertinya terjadi kesalahan pada API, Minta bantuan ke owner ya.");
                                }
                            })
                            .catch(error => {
                                console.error(error);
                                m.react('👨🏻');
                                // m.reply("Hmmm sepertinya terjadi kesalahan, Minta bantuan ke owner ya.");
                            });
                    }
                }
                }
                } catch ({ message }) {
        console.log(chalk.redBright(message))
    }
}
let file = require.resolve(__filename);
watchFile(file, () => {
    unwatchFile(file);
    console.log(chalk.redBright(`File telah diubah: ${__filename}`));
    delete require.cache[file];
    require(file);
});
