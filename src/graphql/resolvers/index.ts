import { AppDataSource } from '../../config/database'
import { User } from '../../entities/User'
import { Category } from '../../entities/Category'
import { Product } from '../../entities/Product'
import { Order } from '../../entities/Order'
import { OrderItem } from '../../entities/OrderItem'
import { AuthService } from '../../utils/auth/auth'

export const resolvers = {
  Query: {
    hello: () => 'Hello, World!',
    users: async () => {
      const userRepository = AppDataSource.getRepository(User)
      return await userRepository.find()
    },
    user: async (_: any, { id }: { id: string }) => {
      const userRepository = AppDataSource.getRepository(User)
      return await userRepository.findOneBy({ userId: parseInt(id) })
    },
    categories: async () => {
      const categoryRepository = AppDataSource.getRepository(Category)
      return await categoryRepository.find({ relations: ['products'] })
    },
    category: async (_: any, { id }: { id: string }) => {
      const categoryRepository = AppDataSource.getRepository(Category)
      return await categoryRepository.findOne({
        where: { categoryId: parseInt(id) },
        relations: ['products']
      })
    },
    products: async () => {
      const productRepository = AppDataSource.getRepository(Product)
      return await productRepository.find({ relations: ['category', 'orderItems'] })
    },
    product: async (_: any, { id }: { id: string }) => {
      const productRepository = AppDataSource.getRepository(Product)
      return await productRepository.findOne({
        where: { productId: parseInt(id) },
        relations: ['category', 'orderItems']
      })
    },
    orders: async () => {
      const orderRepository = AppDataSource.getRepository(Order)
      return await orderRepository.find({ relations: ['orderItems'] })
    },
    order: async (_: any, { id }: { id: string }) => {
      const orderRepository = AppDataSource.getRepository(Order)
      return await orderRepository.findOne({
        where: { orderId: parseInt(id) },
        relations: ['orderItems']
      })
    },
    me: async (_: any, __: any, context: any) => {
      if (!context.user) {
        return null
      }
      return context.user
    }
  },
  Mutation: {
    register: async (_: any, { input }: { input: { username: string; email: string; password: string } }) => {
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
          passwordHash: hashedPassword
        })

        await userRepository.save(user)

        const token = AuthService.generateToken({ userId: user.userId, username: user.username })

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
    },
    login: async (_: any, { input }: { input: { username: string; password: string } }) => {
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

        const token = AuthService.generateToken({ userId: user.userId, username: user.username })

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
    }
  }
}
