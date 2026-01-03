import { AppDataSource } from '../../config/database'
import { User, Permission, UserRole } from '../../entities/User'
import { Category } from '../../entities/Category'
import { Product } from '../../entities/Product'
import { ProductImage } from '../../entities/ProductImage'
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
    products: requirePermission(Permission.READ_PRODUCTS)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number; sortBy?: 'NAME' | 'IMPORT_PRICE' | 'COUNT' | 'CREATED_AT' | 'PRODUCT_ID'; sortOrder?: 'ASC' | 'DESC'; minPrice?: number; maxPrice?: number } }, context: any) => {
      const productRepository = AppDataSource.getRepository(Product)
      const queryBuilder = productRepository.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.orderItems', 'orderItems')
        .leftJoinAndSelect('product.images', 'images')

      // Search filter
      if (params?.search) {
        queryBuilder.where('product.name LIKE :search OR product.sku LIKE :search OR product.description LIKE :search', { search: `%${params.search}%` })
      }

      // Price range filter
      if (params?.minPrice !== undefined) {
        queryBuilder.andWhere('product.importPrice >= :minPrice', { minPrice: params.minPrice })
      }
      if (params?.maxPrice !== undefined) {
        queryBuilder.andWhere('product.importPrice <= :maxPrice', { maxPrice: params.maxPrice })
      }

      // Sorting
      const sortFieldMap: { [key: string]: string } = {
        'NAME': 'name',
        'IMPORT_PRICE': 'importPrice',
        'COUNT': 'count',
        'CREATED_AT': 'createdAt',
        'PRODUCT_ID': 'productId'
      }

      if (params?.sortBy) {
        const dbField = sortFieldMap[params.sortBy]
        if (dbField) {
          const sortOrder = params.sortOrder === 'DESC' ? 'DESC' : 'ASC'
          queryBuilder.orderBy(`product.${dbField}`, sortOrder)
        }
      } else {
        // Default sort by productId DESC (newest first)
        queryBuilder.orderBy('product.productId', 'DESC')
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
        relations: ['category', 'orderItems', 'images']
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
    }),
    createProduct: requirePermission(Permission.MANAGE_PRODUCTS)(async (_: any, { input }: { input: { sku: string; name: string; importPrice: number; count: number; description: string; images: Array<{ url: string; altText?: string; position?: number; isPrimary?: boolean }>; categoryId: number } }) => {
      const productRepository = AppDataSource.getRepository(Product)
      const categoryRepository = AppDataSource.getRepository(Category)
      const productImageRepository = AppDataSource.getRepository(ProductImage)

      if (input.sku.trim().length === 0) {
        throw new ValidationError('SKU cannot be empty', 'sku')
      }

      if (input.sku.length > 50) {
        throw new ValidationError('SKU must be less than 50 characters', 'sku')
      }

      const existingProduct = await productRepository.findOne({ where: { sku: input.sku } })
      if (existingProduct) {
        throw new ValidationError('SKU already exists', 'sku')
      }

      if (input.name.trim().length === 0) {
        throw new ValidationError('Product name cannot be empty', 'name')
      }

      if (input.name.length > 200) {
        throw new ValidationError('Product name must be less than 200 characters', 'name')
      }

      if (input.importPrice < 0) {
        throw new ValidationError('Import price cannot be negative', 'importPrice')
      }

      if (input.count < 0) {
        throw new ValidationError('Count cannot be negative', 'count')
      }

      if (input.description.length > 1000) {
        throw new ValidationError('Description must be less than 1000 characters', 'description')
      }

      if (!Array.isArray(input.images) || input.images.length < 3) {
        throw new ValidationError('At least 3 images are required', 'images')
      }

      const cleanedImages = input.images.map((img, idx) => {
        const url = img.url !== undefined && img.url !== null ? String(img.url).trim() : ''
        const altText = img.altText !== undefined && img.altText !== null ? String(img.altText).trim() : ''
        const position = img.position !== undefined && img.position !== null ? Number(img.position) : idx
        const isPrimary = !!img.isPrimary
        if (url.length === 0) {
          throw new ValidationError('Image url cannot be empty', 'images')
        }
        if (url.length > 1000) {
          throw new ValidationError('Image url must be less than 1000 characters', 'images')
        }
        if (altText.length > 200) {
          throw new ValidationError('Image altText must be less than 200 characters', 'images')
        }
        return { url, altText, position, isPrimary }
      })

      const category = await categoryRepository.findOne({ where: { categoryId: input.categoryId } })
      if (!category) {
        throw new NotFoundError('Category')
      }

      let primaryCount = cleanedImages.filter(i => i.isPrimary).length
      if (primaryCount === 0) {
        cleanedImages[0].isPrimary = true
      } else if (primaryCount > 1) {
        throw new ValidationError('Only one image can be primary', 'images')
      }

      const product = productRepository.create({
        sku: input.sku.trim(),
        name: input.name.trim(),
        importPrice: input.importPrice,
        count: input.count,
        description: input.description,
        categoryId: input.categoryId
      })

      await AppDataSource.transaction(async transactionalEntityManager => {
        const savedProduct = await transactionalEntityManager.save(Product, product)
        const imagesToSave = cleanedImages.map(img => ({
          productId: savedProduct.productId,
          url: img.url,
          altText: img.altText,
          position: img.position,
          isPrimary: img.isPrimary
        }))
        await transactionalEntityManager.save(ProductImage, imagesToSave)
      })

      return await productRepository.findOne({
        where: { sku: input.sku.trim() },
        relations: ['category', 'orderItems', 'images']
      })
    }),
    updateProduct: requirePermission(Permission.MANAGE_PRODUCTS)(async (_: any, { id, input }: { id: string; input: { sku?: string; name?: string; importPrice?: number; count?: number; description?: string; images?: Array<{ url: string; altText?: string; position?: number; isPrimary?: boolean }>; categoryId?: number } }) => {
      const productRepository = AppDataSource.getRepository(Product)
      const categoryRepository = AppDataSource.getRepository(Category)
      const product = await productRepository.findOne({ where: { productId: parseInt(id) } })
      if (!product) {
        throw new NotFoundError('Product')
      }

      if (input.sku !== undefined) {
        if (input.sku.trim().length === 0) {
          throw new ValidationError('SKU cannot be empty', 'sku')
        }

        if (input.sku.length > 50) {
          throw new ValidationError('SKU must be less than 50 characters', 'sku')
        }

        const existingProduct = await productRepository.findOne({
          where: { sku: input.sku }
        })
        if (existingProduct && existingProduct.productId !== product.productId) {
          throw new ValidationError('SKU already exists', 'sku')
        }
        if (existingProduct) {
          throw new ValidationError('SKU already exists', 'sku')
        }

        product.sku = input.sku.trim()
      }

      if (input.name !== undefined) {
        if (input.name.trim().length === 0) {
          throw new ValidationError('Product name cannot be empty', 'name')
        }

        if (input.name.length > 200) {
          throw new ValidationError('Product name must be less than 200 characters', 'name')
        }

        product.name = input.name.trim()
      }

      if (input.importPrice !== undefined) {
        if (input.importPrice < 0) {
          throw new ValidationError('Import price cannot be negative', 'importPrice')
        }

        product.importPrice = input.importPrice
      }

      if (input.count !== undefined) {
        if (input.count < 0) {
          throw new ValidationError('Count cannot be negative', 'count')
        }

        product.count = input.count
      }

      if (input.description !== undefined) {
        if (input.description.length > 1000) {
          throw new ValidationError('Description must be less than 1000 characters', 'description')
        }

        product.description = input.description
      }

      if (input.images !== undefined) {
        if (!Array.isArray(input.images) || input.images.length < 3) {
          throw new ValidationError('At least 3 images are required', 'images')
        }

        const cleanedImages = input.images.map((img, idx) => {
          const url = img.url !== undefined && img.url !== null ? String(img.url).trim() : ''
          const altText = img.altText !== undefined && img.altText !== null ? String(img.altText).trim() : ''
          const position = img.position !== undefined && img.position !== null ? Number(img.position) : idx
          const isPrimary = !!img.isPrimary
          if (url.length === 0) {
            throw new ValidationError('Image url cannot be empty', 'images')
          }
          if (url.length > 1000) {
            throw new ValidationError('Image url must be less than 1000 characters', 'images')
          }
          if (altText.length > 200) {
            throw new ValidationError('Image altText must be less than 200 characters', 'images')
          }
          return { url, altText, position, isPrimary }
        })

        let primaryCount = cleanedImages.filter(i => i.isPrimary).length
        if (primaryCount === 0) {
          cleanedImages[0].isPrimary = true
        } else if (primaryCount > 1) {
          throw new ValidationError('Only one image can be primary', 'images')
        }

        await AppDataSource.transaction(async transactionalEntityManager => {
          product.categoryId = product.categoryId
          await transactionalEntityManager.save(Product, product)
          await transactionalEntityManager.delete(ProductImage, { productId: product.productId })
          const imagesToSave = cleanedImages.map(img => ({
            productId: product.productId,
            url: img.url,
            altText: img.altText,
            position: img.position,
            isPrimary: img.isPrimary
          }))
          await transactionalEntityManager.save(ProductImage, imagesToSave)
        })
        return await productRepository.findOne({ where: { productId: product.productId }, relations: ['category', 'orderItems', 'images'] })
      }

      if (input.categoryId !== undefined) {
        const category = await categoryRepository.findOne({ where: { categoryId: input.categoryId } })
        if (!category) {
          throw new NotFoundError('Category')
        }

        product.categoryId = input.categoryId
      }

      return await productRepository.save(product)
    }),
    deleteProduct: requirePermission(Permission.MANAGE_PRODUCTS)(async (_: any, { id }: { id: string }) => {
      const productRepository = AppDataSource.getRepository(Product)

      const product = await productRepository.findOne({
        where: { productId: parseInt(id) },
        relations: ['orderItems']
      })

      if (!product) {
        throw new NotFoundError('Product')
      }

      if (product.orderItems && product.orderItems.length > 0) {
        throw new BadRequestError('Cannot delete product that has been ordered')
      }

      await productRepository.remove(product)
      return true
    })
  },
  Order: {
    createdTime: (order: Order) => {
      return order.createdTime.toISOString()
    }
  }
}
