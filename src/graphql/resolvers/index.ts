import { AppDataSource } from '../../config/database'
import { User, Permission, UserRole } from '../../entities/User'
import { Category } from '../../entities/Category'
import { Product } from '../../entities/Product'
import { Order } from '../../entities/Order'
import { OrderItem } from '../../entities/OrderItem'
import { AuthService } from '../../utils/auth/auth'
import { requireAuth, requirePermission, requireRole, optionalAuth } from '../../middleware/authorization'
import { ValidationError, NotFoundError, PermissionError, BadRequestError } from '../../utils/errors/CustomErrors'

enum OrderStatus {
  Created = 'Created',
  Paid = 'Paid',
  Cancelled = 'Cancelled'
}

export const resolvers = {
  Query: {
    hello: optionalAuth()(() => 'Hello, World!'),
    users: requirePermission(Permission.MANAGE_USERS)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number } }) => {
      const userRepository = AppDataSource.getRepository(User)
      const queryBuilder = userRepository.createQueryBuilder('user')

      if (params?.search) {
        queryBuilder.where('user.username LIKE :search OR user.email LIKE :search', { search: `%${params.search}%` })
      }

      const page = params?.page || 1
      const limit = params?.limit || 10
      const offset = (page - 1) * limit

      const [items, totalCount] = await queryBuilder
        .skip(offset)
        .take(limit)
        .getManyAndCount()

      const totalPages = Math.ceil(totalCount / limit)

      return {
        items,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    }),
    user: requirePermission(Permission.MANAGE_USERS)(async (_: any, { id }: { id: string }) => {
      const userRepository = AppDataSource.getRepository(User)
      return await userRepository.findOneBy({ userId: parseInt(id) })
    }),
    categories: requirePermission(Permission.READ_CATEGORIES)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number } }) => {
      const categoryRepository = AppDataSource.getRepository(Category)
      const queryBuilder = categoryRepository.createQueryBuilder('category').leftJoinAndSelect('category.products', 'products')

      if (params?.search) {
        queryBuilder.where('category.name LIKE :search OR category.description LIKE :search', { search: `%${params.search}%` })
      }

      const page = params?.page || 1
      const limit = params?.limit || 10
      const offset = (page - 1) * limit

      const [items, totalCount] = await queryBuilder
        .skip(offset)
        .take(limit)
        .getManyAndCount()

      const totalPages = Math.ceil(totalCount / limit)

      return {
        items,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    }),
    category: requirePermission(Permission.READ_CATEGORIES)(async (_: any, { id }: { id: string }) => {
      const categoryRepository = AppDataSource.getRepository(Category)
      return await categoryRepository.findOne({
        where: { categoryId: parseInt(id) },
        relations: ['products']
      })
    }),
    products: requirePermission(Permission.READ_PRODUCTS)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number } }, context: any) => {
      const productRepository = AppDataSource.getRepository(Product)
      const queryBuilder = productRepository.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.orderItems', 'orderItems')

      if (params?.search) {
        queryBuilder.where('product.name LIKE :search OR product.sku LIKE :search OR product.description LIKE :search', { search: `%${params.search}%` })
      }

      const page = params?.page || 1
      const limit = params?.limit || 10
      const offset = (page - 1) * limit

      const [items, totalCount] = await queryBuilder
        .skip(offset)
        .take(limit)
        .getManyAndCount()

      const totalPages = Math.ceil(totalCount / limit)

      const processedItems = context.user.role === UserRole.ADMIN
        ? items
        : items.map(product => ({
            ...product,
            importPrice: null
          }))

      return {
        items: processedItems,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
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
    orders: requirePermission(Permission.READ_ORDERS)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number; startDate?: string; endDate?: string } }, context: any) => {
      const orderRepository = AppDataSource.getRepository(Order)
      const queryBuilder = orderRepository.createQueryBuilder('order')
        .leftJoinAndSelect('order.orderItems', 'orderItems')
        .leftJoinAndSelect('orderItems.product', 'product')

      if (context.user.role !== UserRole.ADMIN) {
        queryBuilder.where('order.userId = :userId', { userId: context.user.userId })
      }

      if (params?.search) {
        const whereCondition = context.user.role === UserRole.ADMIN
          ? 'order.status LIKE :search'
          : 'order.status LIKE :search AND order.userId = :userId'
        queryBuilder.andWhere(whereCondition, { search: `%${params.search}%`, userId: context.user.userId })
      }

      if (params?.startDate) {
        queryBuilder.andWhere('DATE(order.createdTime) >= :startDate', { startDate: params.startDate })
      }

      if (params?.endDate) {
        queryBuilder.andWhere('DATE(order.createdTime) <= :endDate', { endDate: params.endDate })
      }

      const page = params?.page || 1
      const limit = params?.limit || 10
      const offset = (page - 1) * limit

      const [items, totalCount] = await queryBuilder
        .skip(offset)
        .take(limit)
        .getManyAndCount()

      const totalPages = Math.ceil(totalCount / limit)

      return {
        items,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    }),
    order: requirePermission(Permission.READ_ORDERS)(async (_: any, { id }: { id: string }, context: any) => {
      const orderRepository = AppDataSource.getRepository(Order)

      if (context.user.role === UserRole.ADMIN) {
        return await orderRepository.findOne({
          where: { orderId: parseInt(id) },
          relations: ['orderItems', 'orderItems.product']
        })
      } else {
        return await orderRepository.findOne({
          where: {
            orderId: parseInt(id),
            userId: context.user.userId
          },
          relations: ['orderItems', 'orderItems.product']
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
    }),
    addOrder: requireAuth()(async (_: any, { input }: { input: { orderItems: Array<{ productId: number; quantity: number }> } }, context: any) => {
      if (context.user.role !== UserRole.ADMIN) {
        throw new PermissionError('Only admin can create orders')
      }

      const orderRepository = AppDataSource.getRepository(Order)
      const orderItemRepository = AppDataSource.getRepository(OrderItem)
      const productRepository = AppDataSource.getRepository(Product)

      const targetUserId = context.user.userId

      const productIds = input.orderItems.map(item => item.productId)
      const products = await productRepository.findByIds(productIds)

      if (products.length !== productIds.length) {
        throw new ValidationError('Some products not found')
      }

      const productMap = new Map(products.map(p => [p.productId, p]))

      let totalPrice = 0
      const orderItems: Partial<OrderItem>[] = []

      for (const item of input.orderItems) {
        const product = productMap.get(item.productId)
        if (!product) {
          throw new NotFoundError('Product')
        }

        if (item.quantity <= 0) {
          throw new ValidationError('Quantity must be greater than 0', 'quantity')
        }

        if (item.quantity > product.count) {
          throw new ValidationError(`Insufficient stock for product ${product.name}. Available: ${product.count}`)
        }

        const unitPrice = product.importPrice
        const itemTotal = Math.round(unitPrice * item.quantity)

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitSalePrice: unitPrice,
          totalPrice: itemTotal
        })

        totalPrice += itemTotal
      }

      await AppDataSource.transaction(async transactionalEntityManager => {
        const order = orderRepository.create({
          userId: targetUserId,
          finalPrice: totalPrice,
          status: OrderStatus.Created
        })

        const savedOrder = await transactionalEntityManager.save(Order, order)

        for (const orderItem of orderItems) {
          orderItem.orderId = savedOrder.orderId
        }

        await transactionalEntityManager.save(OrderItem, orderItems)

        for (const item of input.orderItems) {
          const product = productMap.get(item.productId)!
          product.count -= item.quantity
          await transactionalEntityManager.save(Product, product)
        }
      })

      return await orderRepository.findOne({
        where: { orderId: (await orderRepository.findOne({ where: { userId: targetUserId }, order: { orderId: 'DESC' } }))!.orderId },
        relations: ['orderItems', 'orderItems.product']
      })
    }),
    updateOrder: requireAuth()(async (_: any, { id, input }: { id: string; input: { status: OrderStatus } }, context: any) => {
      if (context.user.role !== UserRole.ADMIN) {
        throw new PermissionError('Only admin can update orders')
      }

      const orderRepository = AppDataSource.getRepository(Order)

      const order = await orderRepository.findOne({
        where: { orderId: parseInt(id) },
        relations: ['orderItems', 'orderItems.product']
      })

      if (!order) {
        throw new NotFoundError('Order')
      }


      const currentStatus = order.status as OrderStatus
      const newStatus = input.status as OrderStatus

      if (currentStatus === OrderStatus.Created) {
        if (newStatus === OrderStatus.Created) {
          return order
        }

        if (newStatus !== OrderStatus.Paid && newStatus !== OrderStatus.Cancelled) {
          throw new BadRequestError('Created orders can only transition to Paid or Cancelled')
        }
      } else {
        throw new BadRequestError('Order status is final and cannot be changed')
      }

      order.status = newStatus
      return await orderRepository.save(order)
    }),
    deleteOrder: requireAuth()(async (_: any, { id }: { id: string }, context: any) => {
      if (context.user.role !== UserRole.ADMIN) {
        throw new PermissionError('Only admin can delete orders')
      }

      const orderRepository = AppDataSource.getRepository(Order)
      const productRepository = AppDataSource.getRepository(Product)

      const order = await orderRepository.findOne({
        where: { orderId: parseInt(id) },
        relations: ['orderItems', 'orderItems.product']
      })

      if (!order) {
        throw new NotFoundError('Order')
      }

      if (order.status !== OrderStatus.Created) {
        throw new BadRequestError('Can only delete orders with status \"Created\"')
      }

      await AppDataSource.transaction(async transactionalEntityManager => {
        for (const orderItem of order.orderItems) {
          const product = orderItem.product
          product.count += orderItem.quantity
          await transactionalEntityManager.save(Product, product)
        }

        await transactionalEntityManager.delete(Order, { orderId: order.orderId })
      })

      return true
    })
  },
  Order: {
    createdTime: (order: Order) => {
      return order.createdTime.toISOString()
    }
  }
}
