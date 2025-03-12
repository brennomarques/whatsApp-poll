import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateTables1741790192640 implements MigrationInterface {
    name = 'CreateTables1741790192640'

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
                    type: "text"
                },
                {
                    name: "status",
                    type: "varchar",
                    default: "'sent'"
                },
                {
                    name: "messageId",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "connection",
            columns: [
                {
                    name: "id",
                    type: "integer",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "isConnected",
                    type: "boolean",
                    default: false
                },
                {
                    name: "phoneNumber",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP"
                }
            ]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("connection");
        await queryRunner.dropTable("poll");
    }
}
