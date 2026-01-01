import { Permission, UserRole } from '../entities/User'
import { AuthorizationService } from '../utils/auth/authorization'

export interface GraphQLContext {
  user: any
  logger: any
}

export function requireAuth() {
  return (resolver: any) => {
    return async (parent: any, args: any, context: GraphQLContext, info: any) => {
      AuthorizationService.requireAuth(context.user)
      return resolver(parent, args, context, info)
    }
  }
}

export function requirePermission(permission: Permission) {
  return (resolver: any) => {
    return async (parent: any, args: any, context: GraphQLContext, info: any) => {
      AuthorizationService.requirePermission(context.user, permission)
      return resolver(parent, args, context, info)
    }
  }
}

export function requireRole(role: UserRole) {
  return (resolver: any) => {
    return async (parent: any, args: any, context: GraphQLContext, info: any) => {
      AuthorizationService.requireRole(context.user, role)
      return resolver(parent, args, context, info)
    }
  }
}

export function optionalAuth() {
  return (resolver: any) => {
    return async (parent: any, args: any, context: GraphQLContext, info: any) => {
      return resolver(parent, args, context, info)
    }
  }
}
