import { AppDataSource } from '../../../config/database'
import { Promotion } from '../../../entities/Promotion'
import { requirePermission } from '../../../middleware/authorization'
import { Permission } from '../../../entities/User'

export const promotionQueries = {
  promotions: requirePermission(Permission.MANAGE_SYSTEM)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number } }) => {
    const promotionRepository = AppDataSource.getRepository(Promotion)
    const queryBuilder = promotionRepository.createQueryBuilder('promotion')

    if (params?.search) {
      queryBuilder.where('promotion.code LIKE :search OR promotion.description LIKE :search', { search: `%${params.search}%` })
    }

    queryBuilder.orderBy('promotion.createdAt', 'DESC')

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

  promotion: requirePermission(Permission.MANAGE_SYSTEM)(async (_: any, { id }: { id: string }) => {
    const promotionRepository = AppDataSource.getRepository(Promotion)
    return await promotionRepository.findOneBy({ promotionId: parseInt(id) })
  })
}
