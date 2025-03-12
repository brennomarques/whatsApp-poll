import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Poll } from '../models/Poll';
import { Connection } from '../models/Connection';

export class HomeController {
    private pollRepository = AppDataSource.getRepository(Poll);
    private connectionRepository = AppDataSource.getRepository(Connection);

    public async index(req: Request, res: Response): Promise<void> {
        try {
            const polls = await this.pollRepository.find({
                order: {
                    createdAt: 'DESC'
                }
            });

            // Busca o status da conexão
            const connection = await this.connectionRepository.findOne({
                where: {},
                order: {
                    id: 'DESC'
                }
            });

            // Renderiza a view com as enquetes e o status da conexão
            res.render('index', {
                title: 'Home',
                polls,
                connected: connection?.isConnected || false
            });
        } catch (error) {
            console.error('Erro ao buscar enquetes:', error);
            res.render('index', {
                title: 'Home',
                polls: [],
                connected: false
            });
        }
    }
} 