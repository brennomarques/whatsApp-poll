import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { WAMessageKey } from '@whiskeysockets/baileys';

@Entity()
export class Poll {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    question!: string;

    @Column('simple-array')
    options!: string[];

    @Column()
    targetNumber!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column('json', { nullable: true })
    messageId?: WAMessageKey;
} 