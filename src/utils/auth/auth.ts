import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'

export class AuthService {
  private static readonly SALT_ROUNDS = 12
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS)
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  static generateToken(payload: object): string {
    return jwt.sign(payload, this.JWT_SECRET!, {
      expiresIn: this.JWT_EXPIRES_IN
    } as jwt.SignOptions)
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET!)
    } catch (error) {
      return null
    }
  }
}
