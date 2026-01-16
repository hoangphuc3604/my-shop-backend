import { AppDataSource } from '../../../config/database'
import { Promotion } from '../../../entities/Promotion'
import { requirePermission } from '../../../middleware/authorization'
import { Permission } from '../../../entities/User'

export const promotionQueries = {
  promotions: requirePermission(Permission.READ_PRODUCTS)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number; isActive?: boolean } }) => {
    const promotionRepository = AppDataSource.getRepository(Promotion)
    const queryBuilder = promotionRepository.createQueryBuilder('promotion')

    let whereConditions = ''
    const whereParams: any = {}

    if (params?.search) {
      whereConditions = 'promotion.code LIKE :search OR promotion.description LIKE :search'
      whereParams.search = `%${params.search}%`
    }

    if (params?.isActive !== undefined) {
      if (whereConditions) {
        whereConditions += ' AND promotion.isActive = :isActive'
      } else {
        whereConditions = 'promotion.isActive = :isActive'
      }
      whereParams.isActive = params.isActive
    }

    if (whereConditions) {
      queryBuilder.where(whereConditions, whereParams)
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

  promotion: requirePermission(Permission.READ_PRODUCTS)(async (_: any, { id }: { id: string }) => {
    const promotionRepository = AppDataSource.getRepository(Promotion)
    return await promotionRepository.findOneBy({ promotionId: parseInt(id) })
  })
}
