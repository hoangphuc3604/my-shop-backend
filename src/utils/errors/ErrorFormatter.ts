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

  const extCode = (error as any).extensions && (error as any).extensions.code
  if (extCode === 'BAD_USER_INPUT') {
    const rawMsg = error.message || 'Invalid input'
    const fieldMatch = rawMsg.match(/Field\s+"([^"]+)"/) || rawMsg.match(/input\.([a-zA-Z0-9_]+)/)
    const field = fieldMatch ? fieldMatch[1] : undefined

    const friendlyByField: { [key: string]: string } = {
      images: 'Please provide at least 3 images for the product.',
      categoryId: 'Please select a category for the product.',
      sku: 'Please provide a valid SKU.',
      name: 'Please provide a product name.',
      importPrice: 'Please provide a valid import price.',
      count: 'Please provide a valid stock count.'
    }

    const message = field && friendlyByField[field]
      ? friendlyByField[field]
      : 'Invalid input. Please check your data and try again.'

    const formatted: FormattedError = {
      message,
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 400,
      timestamp: new Date().toISOString()
    }

    if (field) {
      formatted.field = field
    }

    return formatted
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
