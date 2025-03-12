import { Router } from 'express';
import { PollController } from '../controllers/PollController';
import { WhatsAppService } from '../services/WhatsAppService';

export function createRoutes(whatsappService: WhatsAppService): Router {
    const router = Router();
    const pollController = new PollController(whatsappService);

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