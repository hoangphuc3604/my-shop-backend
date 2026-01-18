import { AppDataSource } from '../../../config/database'
import { Product } from '../../../entities/Product'
import { Category } from '../../../entities/Category'
import { UserRole, Permission } from '../../../entities/User'
import { requirePermission } from '../../../middleware/authorization'
import { ExcelTemplateGenerator } from '../../../utils/excelTemplate'
import { logger } from '../../../config/logger'

export const productQueries = {
  products: requirePermission(Permission.READ_PRODUCTS)(async (_: any, { params }: { params?: { search?: string; page?: number; limit?: number; sortBy?: 'NAME' | 'IMPORT_PRICE' | 'COUNT' | 'CREATED_AT' | 'PRODUCT_ID'; sortOrder?: 'ASC' | 'DESC'; minPrice?: number; maxPrice?: number; categoryId?: number } }, context: any) => {
    const productRepository = AppDataSource.getRepository(Product)
    const queryBuilder = productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.orderItems', 'orderItems')
      .leftJoinAndSelect('product.images', 'images')

    // Category filter
    if (params?.categoryId !== undefined) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: params.categoryId })
    }

    if (params?.search) {
      const searchTerms = params.search.trim().split(/\s+/).filter(term => term.length > 0)
      
      if (searchTerms.length > 0) {
        // Lower threshold for better fuzzy matches
        await productRepository.manager.query("SET pg_trgm.word_similarity_threshold = 0.7")

        const tsQuery = searchTerms.map(term => `${term}:*`).join(' & ')
        
        queryBuilder
          .addSelect(`ts_rank(product.document_with_weights, to_tsquery('english', :tsQuery))`, 'rank')
          .addSelect(`word_similarity(lower(:searchTerm), lower(product.name))`, 'sim')
          .where(`(
            product.document_with_weights @@ to_tsquery('english', :tsQuery)
            OR
            lower(:searchTerm) <% lower(product.name)
            OR
            product.name ILIKE :likeSearch
          )`, { 
            tsQuery, 
            searchTerm: params.search, 
            likeSearch: `%${params.search}%` 
          })
          .orderBy('rank', 'DESC')
          .addOrderBy('sim', 'DESC')
      }
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

    const processedItems = items

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

    return product
  }),

  /**
   * Returns an Excel template file for bulk product import with instructions and validation hints
   * @param _ - Parent object (unused)
   * @param args - Query arguments (unused)
   * @param context - GraphQL context with user info
   * @returns Template file as base64 with filename and mime type
   */
  productTemplate: requirePermission(Permission.MANAGE_PRODUCTS)(async (_: any, args: any, context: any) => {
    logger.info(`Generating product template for user: ${context.user.username}`)

    try {
      const categoryRepository = AppDataSource.getRepository(Category)
      const categories = await categoryRepository.find({
        select: ['categoryId', 'name', 'description']
      })

      logger.info(`Found ${categories.length} categories for template dropdown`)

      const templateResult = await ExcelTemplateGenerator.generateProductTemplate(categories)

      logger.info(`Successfully generated product template (${templateResult.filename})`)

      return templateResult
    } catch (error) {
      logger.error(`Failed to generate product template: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw new Error('Failed to generate product template')
    }
  })
}

