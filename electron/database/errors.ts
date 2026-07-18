export class DatabaseError extends Error {
  readonly code = 'DATABASE_ERROR';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseError';
  }
}

export function databaseOperation<T>(operation: () => T) {
  try {
    return operation();
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError('The local music database operation failed.', { cause: error });
  }
}
