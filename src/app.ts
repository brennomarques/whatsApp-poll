import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import routes from './routes';
import { AppDataSource } from './data-source';
import { whatsappService } from './services';

const app = express();
const server = createServer(app);
const io = new Server(server);

// Configurações do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configurações do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Rotas
app.use(routes);

// Socket.IO
io.on('connection', async (socket) => {
    console.log('Cliente conectado ao Socket.IO');

    // Verifica o status inicial da conexão
    socket.on('check-connection', async () => {
        const isConnected = whatsappService.isConnected();
        socket.emit('connection-status', isConnected ? 'connected' : 'disconnected');
    });

    // Quando receber solicitação de conexão
    socket.on('connect-whatsapp', async () => {
        console.log('Solicitação de conexão recebida');
        try {
            await whatsappService.connect();
        } catch (error) {
            console.error('Erro ao conectar com WhatsApp:', error);
            socket.emit('connection', 'disconnected');
        }
    });

    // Quando o cliente desconectar
    socket.on('disconnect', () => {
        console.log('Cliente desconectado do Socket.IO');
    });
});

// Eventos do WhatsApp
whatsappService.on('qr', (qr) => {
    console.log('Emitindo QR Code para todos os clientes');
    io.emit('qr', qr);
});

whatsappService.on('connection', (status) => {
    console.log('Emitindo status de conexão:', status);
    io.emit('connection', status);
});

// Inicializa o banco de dados e inicia o servidor
(async () => {
    try {
        // Inicializa o banco de dados
        await AppDataSource.initialize();
        console.log('Banco de dados conectado!');
        
        // Tenta restaurar a conexão do WhatsApp
        const isConnected = await whatsappService.checkConnection();
        if (isConnected) {
            console.log('Conexão com WhatsApp restaurada!');
        }

        // Inicia o servidor
        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao inicializar a aplicação:', error);
        process.exit(1);
    }
})(); 