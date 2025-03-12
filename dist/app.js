"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const express_ejs_layouts_1 = __importDefault(require("express-ejs-layouts"));
const WhatsAppService_1 = require("./services/WhatsAppService");
const routes_1 = require("./routes");
const data_source_1 = require("./data-source");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server);
const whatsappService = new WhatsAppService_1.WhatsAppService();
// Configurações do Express
app.use(express_1.default.json());
app.use(express_1.default.static('public'));
app.use(express_ejs_layouts_1.default);
app.set('view engine', 'ejs');
app.set('views', path_1.default.join(__dirname, '../views'));
app.set('layout', 'layout');
// Configuração das rotas
app.use((0, routes_1.createRoutes)(whatsappService));
// Socket.IO
io.on('connection', async (socket) => {
    console.log('Cliente conectado ao Socket.IO');
    socket.on('connect-whatsapp', async () => {
        console.log('Solicitação de conexão recebida');
        try {
            await whatsappService.connect();
        }
        catch (error) {
            console.error('Erro ao conectar com WhatsApp:', error);
            socket.emit('connection-error', { message: error?.message || 'Erro desconhecido' });
        }
    });
    socket.on('disconnect', () => {
        console.log('Cliente desconectado do Socket.IO');
    });
});
// Eventos do WhatsApp
whatsappService.on('qr', (qr) => {
    io.emit('qr', qr);
});
whatsappService.on('connection', (status) => {
    io.emit('connection', status);
});
// Inicializa o banco de dados e inicia o servidor
data_source_1.AppDataSource.initialize()
    .then(() => {
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
})
    .catch((error) => {
    console.error('Erro ao inicializar o banco de dados:', error);
});
