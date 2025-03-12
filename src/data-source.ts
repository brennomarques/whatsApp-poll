import { DataSource } from "typeorm";
import { Poll } from "./models/Poll";
import { Connection } from "./models/Connection";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: true,
    entities: [Poll, Connection],
    subscribers: [],
    migrations: [],
}); 