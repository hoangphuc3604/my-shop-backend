import { AppDataSource } from '../../../config/database'
import { User, UserRole } from '../../../entities/User'
import { AuthService } from '../../../utils/auth/auth'
import { optionalAuth } from '../../../middleware/authorization'
import { ValidationError } from '../../../utils/errors/CustomErrors'
import { Messages } from '../../../utils/messages'

export const authMutations = {
  register: optionalAuth()(async (_: any, { input }: { input: { username: string; email: string; password: string } }) => {
    try {
      const userRepository = AppDataSource.getRepository(User)

      const existingUser = await userRepository.findOne({
        where: [
          { username: input.username },
          { email: input.email }
        ]
      })

      if (existingUser) {
        return {
          success: false,
          token: null,
          user: null,
          message: Messages.REGISTER_FAILED
        }
      }

      const hashedPassword = await AuthService.hashPassword(input.password)

      const user = userRepository.create({
        username: input.username,
        email: input.email,
        passwordHash: hashedPassword,
        role: UserRole.SALE
      })

      await userRepository.save(user)

      const token = AuthService.generateToken({ userId: user.userId, username: user.username, role: user.role })

      return {
        success: true,
        token,
        user,
        message: Messages.REGISTER_SUCCESS
      }
    } catch (error) {
      return {
        success: false,
        token: null,
        user: null,
        message: Messages.REGISTER_FAILED
      }
    }
  }),
  login: optionalAuth()(async (_: any, { input }: { input: { username: string; password: string } }) => {
    try {
      const userRepository = AppDataSource.getRepository(User)

      const user = await userRepository.findOne({
        where: { username: input.username }
      })

      if (!user || !(await AuthService.verifyPassword(input.password, user.passwordHash))) {
        return {
          success: false,
          token: null,
          user: null,
          message: Messages.INVALID_CREDENTIALS
        }
      }

      if (!user.isActive) {
        return {
          success: false,
          token: null,
          user: null,
          message: Messages.ACCOUNT_INACTIVE
        }
      }

      user.lastLogin = new Date()
      await userRepository.save(user)

      const token = AuthService.generateToken({
        userId: user.userId,
        username: user.username,
        role: user.role
      })

      return {
        success: true,
        token,
        user,
        message: Messages.LOGIN_SUCCESS
      }
    } catch (error) {
      return {
        success: false,
        token: null,
        user: null,
        message: Messages.LOGIN_FAILED
      }
    }
  })
}

