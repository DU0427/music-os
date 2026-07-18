"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = void 0;
exports.databaseOperation = databaseOperation;
class DatabaseError extends Error {
    code = 'DATABASE_ERROR';
    constructor(message, options) {
        super(message, options);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
function databaseOperation(operation) {
    try {
        return operation();
    }
    catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        throw new DatabaseError('The local music database operation failed.', { cause: error });
    }
}
