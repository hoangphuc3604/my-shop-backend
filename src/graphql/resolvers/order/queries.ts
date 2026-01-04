import { AppDataSource } from '../../../config/database'
import { Order } from '../../../entities/Order'
import { UserRole, Permission } from '../../../entities/User'
import { requirePermission } from '../../../middleware/authorization'

export const orderQueries = {
  orders: requirePermission(Permission.READ_ORDERS)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number; startDate?: string; endDate?: string; sortBy?: 'FINAL_PRICE' | 'CREATED_TIME'; sortOrder?: 'ASC' | 'DESC' } }, context: any) => {
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

    // Sorting
    const sortFieldMap: { [key: string]: string } = {
      'FINAL_PRICE': 'finalPrice',
      'CREATED_TIME': 'createdTime'
    }

    if (params?.sortBy) {
      const dbField = sortFieldMap[params.sortBy]
      if (dbField) {
        const sortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC'
        queryBuilder.orderBy(`order.${dbField}`, sortOrder)
      }
    } else {
      queryBuilder.orderBy('order.createdTime', 'DESC')
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
  })
}

