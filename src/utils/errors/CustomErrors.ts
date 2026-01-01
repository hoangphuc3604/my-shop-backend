export enum ErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST'
}

export class GraphQLError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, code: ErrorCode, statusCode: number = 500) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

export class AuthenticationError extends GraphQLError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorCode.UNAUTHENTICATED, 401)
  }
}

export class PermissionError extends GraphQLError {
  constructor(message: string = 'Permission denied') {
    super(message, ErrorCode.FORBIDDEN, 403)
  }
}

export class NotFoundError extends GraphQLError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, 404)
  }
}

export class ValidationError extends GraphQLError {
  public readonly field?: string

  constructor(message: string, field?: string) {
    super(message, ErrorCode.VALIDATION_ERROR, 400)
    this.field = field
  }
}

export class BadRequestError extends GraphQLError {
  constructor(message: string) {
    super(message, ErrorCode.BAD_REQUEST, 400)
  }
}
