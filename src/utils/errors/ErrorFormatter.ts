import { GraphQLError } from 'graphql'
import { GraphQLError as CustomGraphQLError, ErrorCode, ValidationError } from './CustomErrors'
import { getFriendlyMessagesForInput, defaultGenericFieldMessages, getFriendlyMessagesForOperation } from './FriendlyMessageRegistry'

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
    const fieldMatch = rawMsg.match(/Field\s+"([^"]+)"/) || rawMsg.match(/input\.([a-zA-Z0-9_]+)/) || rawMsg.match(/argument\s+"([^"]+)"/)
    const field = fieldMatch ? fieldMatch[1] : undefined

    const inputTypeMatch = rawMsg.match(/([A-Za-z0-9_]+Input)/)
    let inputType = inputTypeMatch ? inputTypeMatch[1] : undefined
    const operation = Array.isArray((error as any).path) ? (error as any).path[0] : undefined
    if (!inputType && typeof operation === 'string') {
      const normalized = operation.charAt(0).toUpperCase() + operation.slice(1)
      inputType = `${normalized}Input`
    }

    const registryMessagesForInput = getFriendlyMessagesForInput(inputType)

    const operationFromPath = Array.isArray((error as any).path) ? (error as any).path[0] : undefined
    let operationName: string | undefined = typeof operationFromPath === 'string' ? operationFromPath : undefined
    if (!operationName && error.nodes && error.nodes.length > 0) {
      for (const node of error.nodes) {
        if ((node as any).kind === 'OperationDefinition' && (node as any).name && (node as any).name.value) {
          operationName = (node as any).name.value
          break
        }
      }
    }

    const registryMessagesForOperation = getFriendlyMessagesForOperation(operationName)

    const registryMessages = registryMessagesForOperation || registryMessagesForInput || defaultGenericFieldMessages
    if (!registryMessagesForInput) {
      const varNameMatch = rawMsg.match(/\$([A-Za-z0-9_]+)/)
      const varName = varNameMatch ? varNameMatch[1] : undefined
      if (varName && error.nodes && error.nodes.length > 0) {
        for (const node of error.nodes) {
          const nd = node as any
          if (nd.kind === 'OperationDefinition' && Array.isArray(nd.variableDefinitions)) {
            for (const varDef of nd.variableDefinitions) {
              if (varDef.variable && varDef.variable.name && varDef.variable.name.value === varName) {
                let typeNode = varDef.type
                while (typeNode && typeNode.kind && typeNode.kind !== 'NamedType') {
                  typeNode = typeNode.type
                }
                if (typeNode && typeNode.name && typeNode.name.value) {
                  const detectedInputType = typeNode.name.value
                  const detectedMessages = getFriendlyMessagesForInput(detectedInputType)
                  if (detectedMessages) {
                    Object.assign(registryMessages, detectedMessages)
                    break
                  }
                }
              }
            }
          }
        }
      }
    }

    let message = 'Invalid input. Please check your data and try again.'
    if (field && registryMessages[field]) {
      message = registryMessages[field]
    }

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
