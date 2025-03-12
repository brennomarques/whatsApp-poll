"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const events_1 = require("events");
const QRCode = __importStar(require("qrcode"));
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const fs = __importStar(require("fs"));
const pino_1 = __importDefault(require("pino"));
const data_source_1 = require("../data-source");
const Connection_1 = require("../models/Connection");
class WhatsAppService extends events_1.EventEmitter {
    constructor() {
        super();
        this.sock = null;
        this.authFolder = './auth';
        this.isConnecting = false;
        this.qrCode = null;
        this.connectionRepository = data_source_1.AppDataSource.getRepository(Connection_1.Connection);
        this.ensureAuthFolder();
    }
    ensureAuthFolder() {
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }
    async checkConnection() {
        const isConnected = this.isConnected();
        if (!isConnected) {
            console.log('WhatsApp não está conectado. Iniciando processo de conexão...');
            await this.connect();
            return false;
        }
        console.log('WhatsApp já está conectado!');
        return true;
    }
    async connect() {
        if (this.isConnecting) {
            console.log('Conexão já em andamento...');
            return;
        }
        this.isConnecting = true;
        console.log('Iniciando conexão com WhatsApp...');
        try {
            // Limpa a pasta auth antes de tentar conectar
            if (fs.existsSync(this.authFolder)) {
                fs.rmSync(this.authFolder, { recursive: true, force: true });
                fs.mkdirSync(this.authFolder);
            }
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(this.authFolder);
            const logger = (0, pino_1.default)({
                level: 'silent'
            });
            // Configuração mais detalhada do socket
            this.sock = (0, baileys_1.default)({
                auth: {
                    creds: state.creds,
                    keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger)
                },
                printQRInTerminal: true,
                logger,
                browser: ['Chrome', 'Windows', ''],
                version: [2, 2204, 13],
                connectTimeoutMs: 60000,
                qrTimeout: 60000,
                defaultQueryTimeoutMs: 60000,
                emitOwnEvents: true,
                generateHighQualityLinkPreview: false,
                markOnlineOnConnect: true
            });
            // Salva as credenciais quando atualizadas
            this.sock.ev.on('creds.update', async () => {
                console.log('Credenciais atualizadas, salvando...');
                await saveCreds();
            });
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                console.log('\n=== Status da Conexão ===');
                console.log('Estado:', connection);
                console.log('Detalhes:', JSON.stringify(update, null, 2));
                console.log('========================\n');
                if (qr) {
                    console.log('\n=== QR Code Recebido ===');
                    console.log('Escaneie o QR Code no seu WhatsApp');
                    console.log('========================\n');
                    this.qrCode = qr;
                    try {
                        qrcode_terminal_1.default.generate(qr, { small: true });
                        const qrUrl = await QRCode.toDataURL(qr);
                        this.emit('qr', qrUrl);
                    }
                    catch (err) {
                        console.error('Erro ao gerar QR code:', err);
                    }
                }
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const shouldReconnect = statusCode !== baileys_1.DisconnectReason.loggedOut;
                    console.log('\n=== Conexão Fechada ===');
                    console.log('Código de status:', statusCode);
                    console.log('Razão:', lastDisconnect?.error?.message);
                    console.log('Tentando reconectar:', shouldReconnect);
                    console.log('=====================\n');
                    await this.updateConnectionState(false);
                    if (shouldReconnect) {
                        console.log('Aguardando 5 segundos antes de reconectar...');
                        setTimeout(() => {
                            console.log('Iniciando reconexão...');
                            this.connect();
                        }, 5000);
                    }
                    else {
                        console.log('Desconexão permanente detectada');
                        this.emit('connection', 'disconnected');
                    }
                    this.isConnecting = false;
                }
                else if (connection === 'open') {
                    console.log('\n=== Conexão Estabelecida ===');
                    console.log('ID do usuário:', this.sock?.user?.id);
                    console.log('=========================\n');
                    await this.updateConnectionState(true, this.sock?.user?.id);
                    this.isConnecting = false;
                    this.emit('connection', 'connected');
                }
            });
            // Monitor de mensagens com mais detalhes
            this.sock.ev.on('messages.upsert', async (m) => {
                console.log('\n=== Nova Mensagem ===');
                console.log('Tipo:', m.type);
                console.log('Mensagem:', JSON.stringify(m.messages[0], null, 2));
                console.log('==================\n');
                if (m.type === 'notify' && m.messages[0]?.message?.pollUpdateMessage) {
                    this.emit('poll.update', m.messages[0]);
                }
            });
        }
        catch (error) {
            console.error('\n=== Erro na Conexão ===');
            console.error('Detalhes:', error);
            console.error('====================\n');
            this.isConnecting = false;
            throw error;
        }
    }
    async sendMessage(to, text) {
        if (!this.sock)
            throw new Error('WhatsApp não está conectado');
        try {
            const formattedNumber = this.formatNumber(to);
            const msg = await this.sock.sendMessage(formattedNumber, { text });
            return msg?.key;
        }
        catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            throw error;
        }
    }
    async sendPoll(to, name, values) {
        if (!this.sock)
            throw new Error('WhatsApp não está conectado');
        try {
            const formattedNumber = this.formatNumber(to);
            const msg = await this.sock.sendMessage(formattedNumber, {
                poll: {
                    name,
                    values,
                    selectableCount: values.length
                }
            });
            return msg?.key;
        }
        catch (error) {
            console.error('Erro ao enviar enquete:', error);
            throw error;
        }
    }
    formatNumber(number) {
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.length < 10 || cleaned.length > 11) {
            throw new Error('Número de telefone inválido');
        }
        return `55${cleaned}@s.whatsapp.net`;
    }
    isConnected() {
        return this.sock?.user !== undefined;
    }
    getQRCode() {
        return this.qrCode;
    }
    async updateConnectionState(isConnected, phoneNumber) {
        try {
            let connection = await this.connectionRepository.findOne({
                where: {},
                order: { id: 'DESC' }
            });
            if (!connection) {
                connection = this.connectionRepository.create();
            }
            connection.isConnected = isConnected;
            if (phoneNumber) {
                connection.phoneNumber = phoneNumber;
            }
            await this.connectionRepository.save(connection);
        }
        catch (error) {
            console.error('Erro ao atualizar estado da conexão:', error);
        }
    }
}
exports.WhatsAppService = WhatsAppService;
