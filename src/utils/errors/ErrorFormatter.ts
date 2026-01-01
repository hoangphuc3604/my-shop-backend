import { GraphQLError } from 'graphql'
import { GraphQLError as CustomGraphQLError, ErrorCode, ValidationError } from './CustomErrors'

export interface FormattedError {
  message: string
  code: ErrorCode
  statusCode: number
  field?: string
  timestamp: string
}

export function formatError(error: GraphQLError): FormattedError {
  const originalError = error.originalError

  if (originalError instanceof CustomGraphQLError) {
    const formattedError: FormattedError = {
      message: originalError.message,
      code: originalError.code,
      statusCode: originalError.statusCode,
      timestamp: new Date().toISOString()
    }

    if (originalError instanceof ValidationError && originalError.field) {
      formattedError.field = originalError.field
    }

    return formattedError
  }

  if (error.message.includes('Authentication required')) {
    return {
      message: 'Authentication required',
      code: ErrorCode.UNAUTHENTICATED,
      statusCode: 401,
      timestamp: new Date().toISOString()
    }
  }

  if (error.message.includes('Permission denied')) {
    return {
      message: 'You do not have permission to perform this action',
      code: ErrorCode.FORBIDDEN,
      statusCode: 403,
      timestamp: new Date().toISOString()
    }
  }

  return {
    message: 'An unexpected error occurred',
    code: ErrorCode.INTERNAL_ERROR,
    statusCode: 500,
    timestamp: new Date().toISOString()
  }
}
