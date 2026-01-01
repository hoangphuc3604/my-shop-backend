import { User, UserRole, Permission } from '../../entities/User'
import { AuthenticationError, PermissionError } from '../errors/CustomErrors'

export class AuthorizationService {
  private static readonly rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
      Permission.READ_USERS,
      Permission.MANAGE_USERS,
      Permission.READ_PRODUCTS,
      Permission.MANAGE_PRODUCTS,
      Permission.VIEW_IMPORT_PRICES,
      Permission.READ_CATEGORIES,
      Permission.MANAGE_CATEGORIES,
      Permission.READ_ORDERS,
      Permission.MANAGE_ORDERS,
      Permission.CREATE_ORDERS,
      Permission.MANAGE_SYSTEM
    ],
    [UserRole.SALE]: [
      Permission.READ_PRODUCTS,
      Permission.READ_CATEGORIES,
      Permission.CREATE_ORDERS,
      Permission.READ_ORDERS
    ]
  }

  static hasPermission(user: User | null, permission: Permission): boolean {
    if (!user || !user.isActive) {
      return false
    }

    const userPermissions = this.rolePermissions[user.role] || []
    return userPermissions.includes(permission)
  }

  static hasRole(user: User | null, role: UserRole): boolean {
    if (!user || !user.isActive) {
      return false
    }

    return user.role === role
  }

  static isAuthenticated(user: User | null): boolean {
    return user !== null && user.isActive
  }

  static requireAuth(user: User | null): void {
    if (!this.isAuthenticated(user)) {
      throw new AuthenticationError()
    }
  }

  static requirePermission(user: User | null, permission: Permission): void {
    this.requireAuth(user)

    if (!this.hasPermission(user, permission)) {
      throw new PermissionError()
    }
  }

  static requireRole(user: User | null, role: UserRole): void {
    this.requireAuth(user)

    if (!this.hasRole(user, role)) {
      throw new PermissionError(`Role ${role} required`)
    }
  }
}
