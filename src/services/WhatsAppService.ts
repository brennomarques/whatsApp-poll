import { Boom } from '@hapi/boom';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    WASocket,
    BaileysEventMap,
    WAMessageKey,
    proto,
    downloadMediaMessage,
    AccountSettings,
    makeCacheableSignalKeyStore,
    Browsers
} from '@whiskeysockets/baileys';
import { EventEmitter } from 'events';
import * as QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import * as fs from 'fs';
import P from 'pino';
import { AppDataSource } from '../data-source';
import { Connection } from '../models/Connection';

export class WhatsAppService extends EventEmitter {
    private sock: WASocket | null = null;
    private authFolder: string = './auth';
    private isConnecting: boolean = false;
    private qrCode: string | null = null;
    private connectionRepository = AppDataSource.getRepository(Connection);

    constructor() {
        super();
        this.ensureAuthFolder();
    }

    private ensureAuthFolder(): void {
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }

    public async checkConnection(): Promise<boolean> {
        const isConnected = this.isConnected();
        if (!isConnected && fs.existsSync(this.authFolder)) {
            console.log('Tentando restaurar conexão existente...');
            await this.connect();
            return this.isConnected();
        }
        return isConnected;
    }

    public async connect(): Promise<void> {
        if (this.isConnecting) {
            console.log('Conexão já em andamento...');
            return;
        }

        this.isConnecting = true;
        console.log('Iniciando conexão com WhatsApp...');

        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

            // Configuração básica seguindo a documentação
            this.sock = makeWASocket({
                auth: state,
                printQRInTerminal: true
            });

            // Salva as credenciais quando atualizadas
            this.sock.ev.on('creds.update', saveCreds);
            
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('\n=========================');
                    console.log('QR Code recebido!');
                    console.log('Escaneie o QR Code abaixo no seu WhatsApp:');
                    console.log('=========================\n');
                    
                    this.qrCode = qr;
                    
                    try {
                        // Gera QR code para terminal
                        qrcodeTerminal.generate(qr, { small: true }, (qrcode) => {
                            console.log(qrcode);
                        });
                        
                        // Gera QR code para interface web
                        const qrUrl = await QRCode.toDataURL(qr);
                        this.emit('qr', qrUrl);
                    } catch (err) {
                        console.error('Erro ao gerar QR code:', err);
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log('Conexão fechada devido a:', lastDisconnect?.error);
                    console.log('Reconectando:', shouldReconnect);
                    
                    await this.updateConnectionState(false);
                    
                    if (shouldReconnect) {
                        this.isConnecting = false;
                        this.connect();
                    } else {
                        console.log('Desconexão permanente detectada');
                        this.emit('connection', 'disconnected');
                    }
                } else if (connection === 'open') {
                    console.log('Conexão estabelecida com sucesso!');
                    await this.updateConnectionState(true, this.sock?.user?.id);
                    this.isConnecting = false;
                    this.emit('connection', 'connected');
                }
            });

            // Monitor de mensagens
            this.sock.ev.on('messages.upsert', async (m) => {
                console.log('Nova mensagem:', JSON.stringify(m, null, 2));
                if (m.type === 'notify' && m.messages[0]?.message?.pollUpdateMessage) {
                    this.emit('poll.update', m.messages[0]);
                }
            });

        } catch (error) {
            console.error('Erro ao conectar:', error);
            this.isConnecting = false;
            throw error;
        }
    }

    public async sendMessage(to: string, text: string): Promise<WAMessageKey | undefined> {
        if (!this.sock) throw new Error('WhatsApp não está conectado');

        try {
            const formattedNumber = this.formatNumber(to);
            const msg = await this.sock.sendMessage(formattedNumber, { text });
            return msg?.key;
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            throw error;
        }
    }

    public async sendPoll(to: string, name: string, values: string[]): Promise<WAMessageKey | undefined> {
        if (!this.sock) throw new Error('WhatsApp não está conectado');

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
        } catch (error) {
            console.error('Erro ao enviar enquete:', error);
            throw error;
        }
    }

    private formatNumber(number: string): string {
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.length < 10 || cleaned.length > 11) {
            throw new Error('Número de telefone inválido');
        }
        return `55${cleaned}@s.whatsapp.net`;
    }

    public isConnected(): boolean {
        return this.sock?.user !== undefined && this.sock?.user !== null;
    }

    public getQRCode(): string | null {
        return this.qrCode;
    }

    private async updateConnectionState(isConnected: boolean, phoneNumber?: string): Promise<void> {
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
        } catch (error) {
            console.error('Erro ao atualizar estado da conexão:', error);
        }
    }
} 