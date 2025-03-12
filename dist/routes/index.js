"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoutes = createRoutes;
const express_1 = require("express");
const PollController_1 = require("../controllers/PollController");
function createRoutes(whatsappService) {
    const router = (0, express_1.Router)();
    const pollController = new PollController_1.PollController(whatsappService);
    // Rotas da API
    router.post('/polls', (req, res) => pollController.create(req, res));
    router.get('/polls/list', (req, res) => pollController.list(req, res));
    router.post('/messages', (req, res) => pollController.sendMessage(req, res));
    // Rotas das páginas
    router.get('/', (req, res) => {
        res.render('index', {
            title: 'WhatsApp Poll',
            connected: whatsappService.isConnected()
        });
    });
    router.get('/polls', (req, res) => {
        res.render('polls', {
            title: 'Enquetes',
            connected: whatsappService.isConnected()
        });
    });
    router.get('/messages', (req, res) => {
        res.render('messages', {
            title: 'Mensagens',
            connected: whatsappService.isConnected()
        });
    });
    return router;
}
