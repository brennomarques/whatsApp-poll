import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Poll {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    question: string;

    @Column()
    recipient: string;

    @Column('simple-json')
    options: { text: string, votes: number }[];

    @CreateDateColumn()
    createdAt: Date;

    @Column()
    status: string;

    @Column({ nullable: true, type: 'varchar' })
    messageId: string | null;

    @Column({ default: 0 })
    totalVotes: number;

    @Column('simple-json', { nullable: true })
    voters: { name: string, vote: string }[];
} 