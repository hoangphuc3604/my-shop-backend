import { AppDataSource } from '../../../config/database'
import { Category } from '../../../entities/Category'
import { Permission } from '../../../entities/User'
import { requirePermission } from '../../../middleware/authorization'

export const categoryQueries = {
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
  })
}

