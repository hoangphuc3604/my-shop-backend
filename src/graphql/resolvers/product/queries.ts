import { AppDataSource } from '../../../config/database'
import { Product } from '../../../entities/Product'
import { UserRole, Permission } from '../../../entities/User'
import { requirePermission } from '../../../middleware/authorization'

export const productQueries = {
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
  })
}

