import { AppDataSource } from '../../config/database'
import { User, Permission, UserRole } from '../../entities/User'
import { Category } from '../../entities/Category'
import { Product } from '../../entities/Product'
import { Order } from '../../entities/Order'
import { OrderItem } from '../../entities/OrderItem'
import { AuthService } from '../../utils/auth/auth'
import { requireAuth, requirePermission, requireRole, optionalAuth } from '../../middleware/authorization'

export const resolvers = {
  Query: {
    hello: optionalAuth()(() => 'Hello, World!'),
    users: requirePermission(Permission.MANAGE_USERS)(async () => {
      const userRepository = AppDataSource.getRepository(User)
      return await userRepository.find()
    }),
    user: requirePermission(Permission.MANAGE_USERS)(async (_: any, { id }: { id: string }) => {
      const userRepository = AppDataSource.getRepository(User)
      return await userRepository.findOneBy({ userId: parseInt(id) })
    }),
    categories: requirePermission(Permission.READ_CATEGORIES)(async () => {
      const categoryRepository = AppDataSource.getRepository(Category)
      return await categoryRepository.find({ relations: ['products'] })
    }),
    category: requirePermission(Permission.READ_CATEGORIES)(async (_: any, { id }: { id: string }) => {
      const categoryRepository = AppDataSource.getRepository(Category)
      return await categoryRepository.findOne({
        where: { categoryId: parseInt(id) },
        relations: ['products']
      })
    }),
    products: requirePermission(Permission.READ_PRODUCTS)(async (_: any, __: any, context: any) => {
      const productRepository = AppDataSource.getRepository(Product)
      const products = await productRepository.find({ relations: ['category', 'orderItems'] })

      if (context.user.role === UserRole.ADMIN) {
        return products
      } else {
        return products.map(product => ({
          ...product,
          importPrice: null
        }))
      }
    }),
    product: requirePermission(Permission.READ_PRODUCTS)(async (_: any, { id }: { id: string }, context: any) => {
      const productRepository = AppDataSource.getRepository(Product)
      const product = await productRepository.findOne({
        where: { productId: parseInt(id) },
        relations: ['category', 'orderItems']
      })

      if (!product) return null

      if (context.user.role === UserRole.ADMIN) {
        return product
      } else {
        return {
          ...product,
          importPrice: null
        }
      }
    }),
    orders: requirePermission(Permission.READ_ORDERS)(async (_: any, __: any, context: any) => {
      const orderRepository = AppDataSource.getRepository(Order)

      if (context.user.role === UserRole.ADMIN) {
        return await orderRepository.find({ relations: ['orderItems'] })
      } else {
        return await orderRepository.find({
          where: { userId: context.user.userId },
          relations: ['orderItems']
        })
      }
    }),
    order: requirePermission(Permission.READ_ORDERS)(async (_: any, { id }: { id: string }, context: any) => {
      const orderRepository = AppDataSource.getRepository(Order)

      if (context.user.role === UserRole.ADMIN) {
        return await orderRepository.findOne({
          where: { orderId: parseInt(id) },
          relations: ['orderItems']
        })
      } else {
        return await orderRepository.findOne({
          where: {
            orderId: parseInt(id),
            userId: context.user.userId
          },
          relations: ['orderItems']
        })
      }
    }),
    me: requireAuth()(async (_: any, __: any, context: any) => {
      return context.user
    })
  },
  Mutation: {
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
            message: 'Username or email already exists'
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
          message: 'User registered successfully'
        }
      } catch (error) {
        return {
          success: false,
          token: null,
          user: null,
          message: 'Registration failed'
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
            message: 'Invalid username or password'
          }
        }

        if (!user.isActive) {
          return {
            success: false,
            token: null,
            user: null,
            message: 'Account is inactive'
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
          message: 'Login successful'
        }
      } catch (error) {
        return {
          success: false,
          token: null,
          user: null,
          message: 'Login failed'
        }
      }
    })
  }
}
