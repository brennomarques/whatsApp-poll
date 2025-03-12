import { Router } from 'express';
import { HomeController } from '../controllers/HomeController';
import { PollController } from '../controllers/PollController';
import { WhatsAppService } from '../services/WhatsAppService';

const router = Router();
const whatsappService = new WhatsAppService();
const pollController = new PollController(whatsappService);

// Rota principal
router.get('/', HomeController.index);

// Rotas de enquetes
router.get('/polls/create', (req, res) => {
    res.render('polls', { title: 'Criar Enquete', connected: true });
});

router.post('/polls', (req, res) => pollController.create(req, res));
router.get('/api/polls', (req, res) => pollController.list(req, res));

export default router; 