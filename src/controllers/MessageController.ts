import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Connection } from '../models/Connection';
import { whatsappService } from '../services';

export class MessageController {
    private connectionRepository = AppDataSource.getRepository(Connection);

    public async index(req: Request, res: Response): Promise<void> {
        try {
            // Busca o status da conexão
            const connection = await this.connectionRepository.findOne({
                where: {},
                order: {
                    id: 'DESC'
                }
            });

            // Renderiza a view com o status da conexão
            res.render('messages', {
                title: 'Mensagens',
                connected: connection?.isConnected || false
            });
        } catch (error) {
            console.error('Erro ao carregar página de mensagens:', error);
            res.render('messages', {
                title: 'Mensagens',
                connected: false
            });
        }
    }

    public async create(req: Request, res: Response): Promise<Response> {
        try {
            const { number, message } = req.body;

            if (!number || !message) {
                return res.status(400).json({ 
                    error: 'Número e mensagem são obrigatórios' 
                });
            }

            // Verifica se está conectado ao WhatsApp
            const connection = await this.connectionRepository.findOne({
                where: {},
                order: { id: 'DESC' }
            });

            if (!connection?.isConnected) {
                return res.status(400).json({ 
                    error: 'Você precisa estar conectado ao WhatsApp para enviar mensagens.' 
                });
            }

            // Envia a mensagem via WhatsApp
            await whatsappService.sendMessage(number, message);

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            return res.status(500).json({ 
                error: 'Erro ao enviar mensagem. Verifique sua conexão com o WhatsApp e tente novamente.' 
            });
        }
    }
} 