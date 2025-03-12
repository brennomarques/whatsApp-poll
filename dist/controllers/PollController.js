"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollController = void 0;
const Poll_1 = require("../models/Poll");
const data_source_1 = require("../data-source");
class PollController {
    constructor(whatsappService) {
        this.pollRepository = data_source_1.AppDataSource.getRepository(Poll_1.Poll);
        this.whatsappService = whatsappService;
    }
    async create(req, res) {
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
        }
        catch (error) {
            console.error('Erro ao criar enquete:', error);
            return res.status(500).json({ error: 'Erro ao criar enquete' });
        }
    }
    async list(req, res) {
        try {
            const { targetNumber } = req.query;
            const query = this.pollRepository.createQueryBuilder('poll');
            if (targetNumber) {
                query.where('poll.targetNumber = :targetNumber', { targetNumber });
            }
            query.orderBy('poll.createdAt', 'DESC');
            const polls = await query.getMany();
            return res.json(polls);
        }
        catch (error) {
            console.error('Erro ao listar enquetes:', error);
            return res.status(500).json({ error: 'Erro ao listar enquetes' });
        }
    }
    async sendMessage(req, res) {
        try {
            const { number, message } = req.body;
            if (!number || !message) {
                return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
            }
            const messageId = await this.whatsappService.sendMessage(number, message);
            return res.json({ success: true, messageId });
        }
        catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            return res.status(500).json({ error: 'Erro ao enviar mensagem' });
        }
    }
}
exports.PollController = PollController;
