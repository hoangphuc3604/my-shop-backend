import { AppDataSource } from '../../config/database'
import { User } from '../../entities/User'
import { Category } from '../../entities/Category'
import { Product } from '../../entities/Product'
import { Order } from '../../entities/Order'
import { OrderItem } from '../../entities/OrderItem'

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
    }
  }
}
