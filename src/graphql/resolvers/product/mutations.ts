import { AppDataSource } from '../../../config/database'
import { Product } from '../../../entities/Product'
import { Category } from '../../../entities/Category'
import { ProductImage } from '../../../entities/ProductImage'
import { Permission } from '../../../entities/User'
import { requirePermission } from '../../../middleware/authorization'
import { ValidationError, NotFoundError, BadRequestError } from '../../../utils/errors/CustomErrors'
import { Messages } from '../../../utils/messages'
import { ExcelImportService } from '../../../utils/excelImport'
import { logger } from '../../../config/logger'

export const productMutations = {
  createProduct: requirePermission(Permission.MANAGE_PRODUCTS)(async (_: any, { input }: { input: { sku: string; name: string; importPrice: number; count: number; description?: string | null; images: Array<{ url: string; altText?: string; position?: number; isPrimary?: boolean }>; categoryId: number } }) => {
    const productRepository = AppDataSource.getRepository(Product)
    const categoryRepository = AppDataSource.getRepository(Category)
    const productImageRepository = AppDataSource.getRepository(ProductImage)

    if (input.sku.trim().length === 0) {
      throw new ValidationError(Messages.SKU_EMPTY, 'sku')
    }

    if (input.sku.length > 50) {
      throw new ValidationError(Messages.SKU_TOO_LONG, 'sku')
    }

    const existingProduct = await productRepository.findOne({ where: { sku: input.sku } })
    if (existingProduct) {
      throw new ValidationError(Messages.SKU_EXISTS, 'sku')
    }

    if (input.name.trim().length === 0) {
      throw new ValidationError(Messages.NAME_EMPTY, 'name')
    }

    if (input.name.length > 200) {
      throw new ValidationError(Messages.NAME_TOO_LONG, 'name')
    }

    if (input.importPrice < 0) {
      throw new ValidationError(Messages.IMPORT_PRICE_NEGATIVE, 'importPrice')
    }

    if (input.count < 0) {
      throw new ValidationError(Messages.COUNT_NEGATIVE, 'count')
    }

    if (input.description !== undefined && input.description !== null) {
      if (input.description.length > 1000) {
        throw new ValidationError(Messages.DESCRIPTION_TOO_LONG, 'description')
      }
    }

    if (!Array.isArray(input.images) || input.images.length < 3) {
      throw new ValidationError(Messages.IMAGES_MIN_REQUIRED, 'images')
    }

    const cleanedImages = input.images.map((img, idx) => {
      const url = img.url !== undefined && img.url !== null ? String(img.url).trim() : ''
      const altText = img.altText !== undefined && img.altText !== null ? String(img.altText).trim() : ''
      const position = img.position !== undefined && img.position !== null ? Number(img.position) : idx
      const isPrimary = !!img.isPrimary
      if (url.length === 0) {
        throw new ValidationError(Messages.IMAGE_URL_EMPTY, 'images')
      }
      if (url.length > 1000) {
        throw new ValidationError(Messages.IMAGE_URL_TOO_LONG, 'images')
      }
      if (altText.length > 200) {
        throw new ValidationError(Messages.IMAGE_ALT_TOO_LONG, 'images')
      }
      return { url, altText, position, isPrimary }
    })

    const category = await categoryRepository.findOne({ where: { categoryId: input.categoryId } })
    if (!category) {
      throw new NotFoundError(Messages.CATEGORY_NOT_FOUND)
    }

    let primaryCount = cleanedImages.filter(i => i.isPrimary).length
    if (primaryCount === 0) {
      cleanedImages[0].isPrimary = true
    } else if (primaryCount > 1) {
      throw new ValidationError(Messages.IMAGES_TOO_MANY_PRIMARY, 'images')
    }

    const product = productRepository.create({
      sku: input.sku.trim(),
      name: input.name.trim(),
      importPrice: input.importPrice,
      count: input.count,
      description: input.description ?? null,
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
  updateProduct: requirePermission(Permission.MANAGE_PRODUCTS)(async (_: any, { id, input }: { id: string; input: { sku?: string; name?: string; importPrice?: number; count?: number; description?: string | null; images?: Array<{ url: string; altText?: string; position?: number; isPrimary?: boolean }>; categoryId?: number } }) => {
    const productRepository = AppDataSource.getRepository(Product)
    const categoryRepository = AppDataSource.getRepository(Category)
    const product = await productRepository.findOne({ where: { productId: parseInt(id) } })
    if (!product) {
      throw new NotFoundError(Messages.PRODUCT_NOT_FOUND)
    }

    if (input.sku !== undefined) {
      if (input.sku.trim().length === 0) {
        throw new ValidationError(Messages.SKU_EMPTY, 'sku')
      }

      if (input.sku.length > 50) {
        throw new ValidationError(Messages.SKU_TOO_LONG, 'sku')
      }

      const existingProduct = await productRepository.findOne({
        where: { sku: input.sku }
      })
      if (existingProduct && existingProduct.productId !== product.productId) {
        throw new ValidationError(Messages.SKU_EXISTS, 'sku')
      }
      if (existingProduct) {
        throw new ValidationError(Messages.SKU_EXISTS, 'sku')
      }

      product.sku = input.sku.trim()
    }

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new ValidationError(Messages.NAME_EMPTY, 'name')
      }

      if (input.name.length > 200) {
        throw new ValidationError(Messages.NAME_TOO_LONG, 'name')
      }

      product.name = input.name.trim()
    }

    if (input.importPrice !== undefined) {
      if (input.importPrice < 0) {
        throw new ValidationError(Messages.IMPORT_PRICE_NEGATIVE, 'importPrice')
      }

      product.importPrice = input.importPrice
    }

    if (input.count !== undefined) {
      if (input.count < 0) {
        throw new ValidationError(Messages.COUNT_NEGATIVE, 'count')
      }

      product.count = input.count
    }

    if (input.description !== undefined) {
      if (input.description !== null && input.description.length > 1000) {
        throw new ValidationError(Messages.DESCRIPTION_TOO_LONG, 'description')
      }

      product.description = input.description
    }

    if (input.images !== undefined) {
      if (!Array.isArray(input.images) || input.images.length < 3) {
        throw new ValidationError(Messages.IMAGES_MIN_REQUIRED, 'images')
      }

      const cleanedImages = input.images.map((img, idx) => {
        const url = img.url !== undefined && img.url !== null ? String(img.url).trim() : ''
        const altText = img.altText !== undefined && img.altText !== null ? String(img.altText).trim() : ''
        const position = img.position !== undefined && img.position !== null ? Number(img.position) : idx
        const isPrimary = !!img.isPrimary
        if (url.length === 0) {
          throw new ValidationError(Messages.IMAGE_URL_EMPTY, 'images')
        }
        if (url.length > 1000) {
          throw new ValidationError(Messages.IMAGE_URL_TOO_LONG, 'images')
        }
        if (altText.length > 200) {
          throw new ValidationError(Messages.IMAGE_ALT_TOO_LONG, 'images')
        }
        return { url, altText, position, isPrimary }
      })

      let primaryCount = cleanedImages.filter(i => i.isPrimary).length
      if (primaryCount === 0) {
        cleanedImages[0].isPrimary = true
      } else if (primaryCount > 1) {
        throw new ValidationError(Messages.IMAGES_TOO_MANY_PRIMARY, 'images')
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
        throw new NotFoundError(Messages.CATEGORY_NOT_FOUND)
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
      throw new NotFoundError(Messages.PRODUCT_NOT_FOUND)
    }

    if (product.orderItems && product.orderItems.length > 0) {
      throw new BadRequestError(Messages.PRODUCT_DELETE_HAS_ORDERS)
    }

    await productRepository.remove(product)
    return true
  }),

  bulkCreateProducts: requirePermission(Permission.MANAGE_PRODUCTS)(async (_: any, { fileBase64 }: { fileBase64: string }) => {
    logger.info('Starting bulk product creation from Excel file')

    // Parse Excel file
    const parseResult = ExcelImportService.parse(fileBase64)
    if (parseResult.errors.length > 0) {
      const errorMessages = parseResult.errors.map(err => `Row ${err.rowIndex}: ${err.message}`).join('; ')
      logger.error(`Excel parsing failed: ${errorMessages}`)
      throw new ValidationError(`Excel parsing failed: ${errorMessages}`)
    }

    const rows = parseResult.rows
    logger.info(`Parsed ${rows.length} rows from Excel file`)

    const productRepository = AppDataSource.getRepository(Product)
    const categoryRepository = AppDataSource.getRepository(Category)
    const productImageRepository = AppDataSource.getRepository(ProductImage)

    let createdCount = 0
    const errors: Array<{ row: number; message: string; field?: string }> = []

    // Process all rows in a single transaction
    await AppDataSource.transaction(async transactionalEntityManager => {
      for (const row of rows) {
        try {
          // Validate SKU uniqueness
          if (row.sku) {
            const existingProduct = await transactionalEntityManager.findOne(Product, {
              where: { sku: row.sku }
            })
            if (existingProduct) {
              throw new ValidationError(Messages.SKU_EXISTS, 'sku')
            }
          }

          // Validate category existence
          const category = await transactionalEntityManager.findOne(Category, {
            where: { categoryId: row.categoryId }
          })
          if (!category) {
            throw new NotFoundError(Messages.CATEGORY_NOT_FOUND)
          }

          // Generate SKU if not provided
          let finalSku = row.sku
          if (!finalSku) {
            finalSku = `AUTO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            // Ensure uniqueness for auto-generated SKU
            let existingProduct = await transactionalEntityManager.findOne(Product, {
              where: { sku: finalSku }
            })
            while (existingProduct) {
              finalSku = `AUTO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
              existingProduct = await transactionalEntityManager.findOne(Product, {
                where: { sku: finalSku }
              })
            }
          }

          // Create product
          const product = transactionalEntityManager.create(Product, {
            sku: finalSku,
            name: row.name,
            importPrice: row.importPrice,
            count: row.stock,
            description: row.description || null,
            categoryId: row.categoryId
          })

          const savedProduct = await transactionalEntityManager.save(Product, product)

          // Create product images if provided
          if (row.images && row.images.length > 0) {
            const imagesToSave = row.images.map((url, index) => ({
              productId: savedProduct.productId,
              url: url,
              altText: '',
              position: index,
              isPrimary: index === 0 // First image is primary
            }))
            await transactionalEntityManager.save(ProductImage, imagesToSave)
          }

          createdCount++
          logger.debug(`Created product: ${savedProduct.name} (SKU: ${savedProduct.sku})`)

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const field = error instanceof ValidationError ? error.field : undefined
          errors.push({
            row: row.rowIndex,
            message: errorMessage,
            field
          })
          logger.warn(`Failed to create product from row ${row.rowIndex}: ${errorMessage}`)
          throw error // Re-throw to trigger transaction rollback
        }
      }
    }).catch((transactionError) => {
      // Transaction failed - this is expected behavior for validation errors
      logger.info(`Transaction rolled back after processing ${createdCount} products with ${errors.length} errors`)
      throw transactionError
    })

    if (errors.length > 0) {
      // If we have errors, the transaction was rolled back
      logger.error(`Bulk creation failed: ${errors.length} errors, ${createdCount} products would have been created`)
      const errorDetails = errors.map(err => `Row ${err.row}: ${err.message}`).join('; ')
      throw new ValidationError(`Bulk creation failed. Errors: ${errorDetails}`)
    }

    logger.info(`Successfully created ${createdCount} products from Excel file`)
    return {
      createdCount,
      failedCount: 0,
      errors: []
    }
  })
}

