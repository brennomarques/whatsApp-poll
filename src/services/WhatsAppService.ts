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

interface PollOption {
    index: number;
}

interface PollVote {
    selectedOptions?: PollOption[];
}

interface PollUpdateMessage {
    vote?: PollVote;
    pollCreationMessageKey?: {
        id?: string;
    };
}

export class WhatsAppService extends EventEmitter {
    private sock: WASocket | null = null;
    private authFolder: string = './auth';
    private isConnecting: boolean = false;
    private qrCode: string | null = null;
    private connectionRepository = AppDataSource.getRepository(Connection);
    private connectionState: boolean = false;
    private retryCount: number = 0;
    private maxRetries: number = 5;
    private baseRetryDelay: number = 1000;

    constructor() {
        super();
        this.ensureAuthFolder();
    }

    private ensureAuthFolder(): void {
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }

    private clearAuthFolder(): void {
        if (fs.existsSync(this.authFolder)) {
            fs.rmSync(this.authFolder, { recursive: true, force: true });
            this.ensureAuthFolder();
        }
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async exponentialBackoff(): Promise<void> {
        const delayMs = this.baseRetryDelay * Math.pow(2, this.retryCount);
        console.log(`Aguardando ${delayMs}ms antes de tentar reconectar...`);
        await this.delay(delayMs);
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

        if (this.retryCount >= this.maxRetries) {
            console.log('Número máximo de tentativas de reconexão atingido');
            this.retryCount = 0;
            this.clearAuthFolder();
            throw new Error('Número máximo de tentativas de reconexão atingido');
        }

        this.isConnecting = true;
        console.log('Iniciando conexão com WhatsApp...');

        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

            const sock = makeWASocket({
                auth: {
                    ...state,
                    creds: {
                        ...state.creds,
                        registered: true
                    }
                },
                printQRInTerminal: true,
                logger: P({ level: 'silent' }),
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                retryRequestDelayMs: 5000,
                browser: Browsers.ubuntu('Chrome'),
                markOnlineOnConnect: true
            });

            sock.ev.on('creds.update', saveCreds);
            
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                console.log('Estado da conexão:', connection);

                if (qr) {
                    console.log('\n=========================');
                    console.log('QR Code recebido!');
                    console.log('Escaneie o QR Code abaixo no seu WhatsApp:');
                    console.log('=========================\n');
                    
                    this.qrCode = qr;
                    
                    try {
                        qrcodeTerminal.generate(qr, { small: true }, (qrcode) => {
                            console.log(qrcode);
                        });
                        
                        const qrUrl = await QRCode.toDataURL(qr);
                        this.emit('qr', qrUrl);
                    } catch (err) {
                        console.error('Erro ao gerar QR code:', err);
                    }
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    console.log('Conexão fechada devido a:', lastDisconnect?.error);
                    console.log('Código de status:', statusCode);
                    console.log('Reconectando:', shouldReconnect);
                    
                    this.connectionState = false;
                    this.sock = null;
                    await this.updateConnectionState(false);
                    
                    if (statusCode === 440) {
                        console.log('Detectado conflito de sessão, limpando pasta de autenticação...');
                        this.clearAuthFolder();
                        this.retryCount = 0;
                    }
                    
                    if (shouldReconnect) {
                        this.isConnecting = false;
                        this.retryCount++;
                        await this.exponentialBackoff();
                        await this.connect();
                    } else {
                        console.log('Desconexão permanente detectada');
                        this.retryCount = 0;
                        this.emit('connection', 'disconnected');
                    }
                } else if (connection === 'open') {
                    console.log('Conexão estabelecida com sucesso!');
                    this.sock = sock;
                    this.connectionState = true;
                    this.retryCount = 0;
                    await this.updateConnectionState(true, sock?.user?.id);
                    this.isConnecting = false;
                    this.emit('connection', 'connected');
                    this.setupMessageHandlers();
                }
            });

            this.sock = sock;

        } catch (error) {
            console.error('Erro ao conectar:', error);
            this.isConnecting = false;
            this.retryCount++;
            throw error;
        }
    }

    public async sendMessage(to: string, text: string): Promise<WAMessageKey | undefined> {
        if (!this.isConnected()) {
            await this.reconnectIfNeeded();
        }

        try {
            const formattedNumber = this.formatNumber(to);
            const msg = await this.sock?.sendMessage(formattedNumber, { text });
            return msg?.key;
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            throw error;
        }
    }

    private async reconnectIfNeeded(): Promise<void> {
        console.log('Tentando reconectar antes de enviar mensagem...');
        await this.connect();
        await this.delay(2000);
        
        if (!this.isConnected()) {
            throw new Error('WhatsApp não está conectado');
        }
    }

    public async sendPoll(to: string, name: string, values: string[]): Promise<WAMessageKey | undefined> {
        if (!this.isConnected()) {
            await this.reconnectIfNeeded();
        }

        try {
            const formattedNumber = this.formatNumber(to);
            console.log('Enviando enquete para:', formattedNumber);
            
            const msg = await this.sock?.sendMessage(formattedNumber, {
                poll: {
                    name,
                    values,
                    selectableCount: 1
                }
            });
            
            if (!msg) {
                throw new Error('Falha ao enviar enquete');
            }
            
            return msg.key;
        } catch (error) {
            console.error('Erro ao enviar enquete:', error);
            throw error;
        }
    }

    private setupMessageHandlers(): void {
        if (!this.sock) return;

        this.sock.ev.on('messages.upsert', async (m) => {
            console.log('Nova mensagem:', JSON.stringify(m, null, 2));
            
            const message = m.messages[0];
            if (message?.message?.pollUpdateMessage) {
                const pollUpdate = message.message.pollUpdateMessage as PollUpdateMessage;
                const voter = message.pushName || message.key.participant?.split('@')[0] || 'Anônimo';
                const messageId = pollUpdate.pollCreationMessageKey?.id || message.key.id;
                
                const selectedOptions = pollUpdate.vote?.selectedOptions?.map(opt => opt.index) || [];
                
                console.log('Atualização de voto em enquete:', {
                    messageId,
                    voter,
                    selectedOptions,
                    timestamp: new Date().toISOString()
                });
                
                this.emit('poll.vote', {
                    messageId,
                    voter,
                    selectedOptions,
                    timestamp: new Date()
                });
            }
        });
    }

    private formatNumber(number: string): string {
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.length < 10 || cleaned.length > 11) {
            throw new Error('Número de telefone inválido');
        }
        return `55${cleaned}@s.whatsapp.net`;
    }

    public isConnected(): boolean {
        const status = {
            sockExists: this.sock !== null,
            userExists: this.sock?.user !== undefined && this.sock?.user !== null,
            connectionState: this.connectionState
        };
        
        console.log('Status da conexão:', status);
        
        if (status.sockExists && status.userExists && !status.connectionState) {
            this.connectionState = true;
        }
        
        return status.sockExists && status.userExists && this.connectionState;
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