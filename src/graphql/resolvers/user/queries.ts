import { AppDataSource } from '../../../config/database'
import { User, Permission } from '../../../entities/User'
import { requirePermission } from '../../../middleware/authorization'

export const userQueries = {
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
  })
}

