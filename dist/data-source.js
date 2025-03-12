"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const Poll_1 = require("./models/Poll");
const Connection_1 = require("./models/Connection");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [Poll_1.Poll, Connection_1.Connection],
    migrations: [],
    subscribers: []
});
