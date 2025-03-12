import { DataSource } from "typeorm";
import { Poll } from "./models/Poll";
import { Connection } from "./models/Connection";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [Poll, Connection],
    migrations: [],
    subscribers: []
}); 