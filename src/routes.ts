import { Router } from 'express';
import { HomeController } from './controllers/HomeController';
import { PollController } from './controllers/PollController';
import { MessageController } from './controllers/MessageController';

const router = Router();
const homeController = new HomeController();
const pollController = new PollController();
const messageController = new MessageController();

// Rota principal
router.get('/', (req, res) => homeController.index(req, res));

// Rotas de enquetes
router.post('/polls', (req, res) => pollController.create(req, res));
router.get('/polls', (req, res) => pollController.list(req, res));
router.get('/polls/:id/results', (req, res) => pollController.getResults(req, res));
router.delete('/polls/:id', (req, res) => pollController.delete(req, res));

// Rotas de mensagens
router.get('/messages', (req, res) => messageController.index(req, res));
router.post('/messages', (req, res) => messageController.create(req, res));

export default router; 