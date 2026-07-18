"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDatabase = openDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const migrations_1 = require("./migrations");
function openDatabase(filePath) {
    const database = new better_sqlite3_1.default(filePath);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    (0, migrations_1.runMigrations)(database);
    return database;
}
