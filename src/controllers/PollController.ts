import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Poll } from '../models/Poll';
import { WAMessageKey } from '@whiskeysockets/baileys';
import { Connection } from '../models/Connection';
import { whatsappService } from '../services';

export class PollController {
    private pollRepository = AppDataSource.getRepository(Poll);

    constructor() {
        // Configura o listener para votos em enquetes
        whatsappService.on('poll.vote', async (voteData) => {
            try {
                console.log('Processando voto:', voteData);
                
                // Busca a enquete pelo messageId
                const poll = await this.pollRepository.findOne({
                    where: { messageId: voteData.messageId }
                });

                if (!poll) {
                    console.log('Enquete não encontrada para o messageId:', voteData.messageId);
                    return;
                }

                // Verifica se o usuário já votou
                const existingVote = poll.voters?.find(voter => voter.name === voteData.voter);
                if (existingVote) {
                    console.log('Usuário já votou nesta enquete:', {
                        voter: voteData.voter,
                        pollId: poll.id,
                        previousVote: existingVote.vote
                    });
                    return;
                }

                // Se chegou aqui, é um novo voto
                const selectedOption = voteData.selectedOptions[0]; // Pega apenas a primeira opção
                if (selectedOption === undefined || selectedOption >= poll.options.length) {
                    console.log('Opção selecionada inválida:', selectedOption);
                    return;
                }

                // Atualiza a contagem de votos
                poll.options = poll.options.map((option, index) => ({
                    ...option,
                    votes: index === selectedOption ? option.votes + 1 : option.votes
                }));

                // Atualiza o total de votos
                poll.totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);

                // Inicializa o array de votantes se necessário
                if (!poll.voters) {
                    poll.voters = [];
                }

                // Adiciona o novo voto
                poll.voters.push({
                    name: voteData.voter,
                    vote: poll.options[selectedOption].text
                });

                // Salva as alterações
                await this.pollRepository.save(poll);

                console.log('Voto registrado com sucesso:', {
                    pollId: poll.id,
                    voter: voteData.voter,
                    option: poll.options[selectedOption].text,
                    totalVotes: poll.totalVotes
                });
            } catch (error) {
                console.error('Erro ao processar voto:', error);
            }
        });
    }

    async create(req: Request, res: Response) {
        try {
            const { target, question, options } = req.body;

            if (!target || !question || !options || options.length < 2) {
                return res.status(400).json({ 
                    error: 'Dados inválidos. Forneça um número/grupo, pergunta e pelo menos 2 opções.' 
                });
            }

            // Verifica se está conectado ao WhatsApp
            const connection = await AppDataSource.getRepository(Connection).findOne({
                where: {},
                order: { id: 'DESC' }
            });

            if (!connection?.isConnected) {
                return res.status(400).json({ 
                    error: 'Você precisa estar conectado ao WhatsApp para criar uma enquete.' 
                });
            }

            // Prepara as opções com contagem de votos inicial
            const formattedOptions = options.map((text: string) => ({ text, votes: 0 }));

            // Tenta enviar a enquete via WhatsApp
            let messageKey: WAMessageKey | undefined;
            try {
                messageKey = await whatsappService.sendPoll(target, question, options);
            } catch (error) {
                console.error('Erro ao enviar enquete via WhatsApp:', error);
                return res.status(500).json({ 
                    error: 'Erro ao enviar enquete. Verifique sua conexão com o WhatsApp e tente novamente.' 
                });
            }

            // Cria o registro da enquete no banco
            const poll = this.pollRepository.create({
                question,
                recipient: target,
                options: formattedOptions,
                status: messageKey ? 'sent' : 'failed',
                messageId: messageKey?.id || null,
                totalVotes: 0,
                voters: []
            });

            await this.pollRepository.save(poll);
            res.status(201).json(poll);

        } catch (error) {
            console.error('Erro ao criar enquete:', error);
            res.status(500).json({ 
                error: 'Erro ao criar enquete. Por favor, tente novamente.' 
            });
        }
    }

    async list(req: Request, res: Response) {
        try {
            const polls = await this.pollRepository.find({
                order: { createdAt: 'DESC' }
            });
            
            // Busca o status da conexão
            const connection = await AppDataSource.getRepository(Connection).findOne({
                where: {},
                order: {
                    id: 'DESC'
                }
            });

            res.render('index', {
                title: 'Enquetes',
                polls,
                connected: connection?.isConnected || false
            });
        } catch (error) {
            console.error('Erro ao listar enquetes:', error);
            res.render('index', {
                title: 'Enquetes',
                polls: [],
                connected: false
            });
        }
    }

    async getResults(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const poll = await this.pollRepository.findOne({ where: { id: parseInt(id) } });

            if (!poll) {
                return res.status(404).json({ error: 'Enquete não encontrada' });
            }

            res.json(poll);
        } catch (error) {
            console.error('Erro ao buscar resultados:', error);
            res.status(500).json({ error: 'Erro ao buscar resultados da enquete' });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const poll = await this.pollRepository.findOne({ where: { id: parseInt(id) } });

            if (!poll) {
                return res.status(404).json({ error: 'Enquete não encontrada' });
            }

            await this.pollRepository.remove(poll);
            res.status(204).send();
        } catch (error) {
            console.error('Erro ao excluir enquete:', error);
            res.status(500).json({ error: 'Erro ao excluir enquete' });
        }
    }
} 