import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePollTable1710251234567 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "poll",
            columns: [
                {
                    name: "id",
                    type: "integer",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "title",
                    type: "varchar"
                },
                {
                    name: "recipient",
                    type: "varchar"
                },
                {
                    name: "options",
                    type: "simple-json"
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "status",
                    type: "varchar",
                    default: "'sent'"
                },
                {
                    name: "messageId",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "totalVotes",
                    type: "integer",
                    default: 0
                },
                {
                    name: "voters",
                    type: "simple-json",
                    isNullable: true
                }
            ]
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("poll");
    }
} 