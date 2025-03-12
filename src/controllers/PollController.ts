import { Request, Response } from 'express';
import { Poll } from '../models/Poll';
import { WhatsAppService } from '../services/WhatsAppService';
import { WAMessageKey } from '@whiskeysockets/baileys';
import { AppDataSource } from '../data-source';

export class PollController {
    private whatsappService: WhatsAppService;
    private pollRepository = AppDataSource.getRepository(Poll);

    constructor(whatsappService: WhatsAppService) {
        this.whatsappService = whatsappService;
    }

    public async create(req: Request, res: Response): Promise<Response> {
        try {
            const { question, options, targetNumber } = req.body;

            if (!question || !options || !targetNumber) {
                return res.status(400).json({ error: 'Dados incompletos' });
            }

            const messageId = await this.whatsappService.sendPoll(targetNumber, question, options);
            
            const poll = this.pollRepository.create({
                question,
                options,
                targetNumber,
                messageId: messageId || undefined
            });

            await this.pollRepository.save(poll);

            return res.status(201).json(poll);
        } catch (error) {
            console.error('Erro ao criar enquete:', error);
            return res.status(500).json({ error: 'Erro ao criar enquete' });
        }
    }

    public async list(req: Request, res: Response): Promise<Response> {
        try {
            const { targetNumber } = req.query;
            
            const query = this.pollRepository.createQueryBuilder('poll');
            
            if (targetNumber) {
                query.where('poll.targetNumber = :targetNumber', { targetNumber });
            }

            query.orderBy('poll.createdAt', 'DESC');
            
            const polls = await query.getMany();
            return res.json(polls);
        } catch (error) {
            console.error('Erro ao listar enquetes:', error);
            return res.status(500).json({ error: 'Erro ao listar enquetes' });
        }
    }

    public async sendMessage(req: Request, res: Response): Promise<Response> {
        try {
            const { number, message } = req.body;

            if (!number || !message) {
                return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
            }

            const messageId = await this.whatsappService.sendMessage(number, message);
            return res.json({ success: true, messageId });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            return res.status(500).json({ error: 'Erro ao enviar mensagem' });
        }
    }
} 