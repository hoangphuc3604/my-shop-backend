import { AppDataSource } from '../../../config/database'
import { Category } from '../../../entities/Category'
import { Permission } from '../../../entities/User'
import { requirePermission } from '../../../middleware/authorization'
import { ValidationError, NotFoundError } from '../../../utils/errors/CustomErrors'
import { Messages } from '../../../utils/messages'

export const categoryMutations = {
  createCategory: requirePermission(Permission.MANAGE_CATEGORIES)(async (_: any, { input }: { input: { name: string; description?: string | null } }) => {
    const categoryRepository = AppDataSource.getRepository(Category)

    if (input.name.trim().length === 0) {
      throw new ValidationError(Messages.CATEGORY_NAME_EMPTY, 'name')
    }

    if (input.name.length > 200) {
      throw new ValidationError(Messages.CATEGORY_NAME_TOO_LONG, 'name')
    }

    const existingCategory = await categoryRepository.findOne({ where: { name: input.name.trim() } })
    if (existingCategory) {
      throw new ValidationError(Messages.CATEGORY_NAME_EXISTS, 'name')
    }

    if (input.description !== undefined && input.description !== null) {
      if (input.description.length > 500) {
        throw new ValidationError(Messages.CATEGORY_DESCRIPTION_TOO_LONG, 'description')
      }
    }

    const category = new Category()
    category.name = input.name.trim()
    category.description = (input.description ?? null) as any

    const savedCategory = await categoryRepository.save(category)

    return await categoryRepository.findOne({
      where: { categoryId: savedCategory.categoryId },
      relations: ['products']
    })
  }),

  updateCategory: requirePermission(Permission.MANAGE_CATEGORIES)(async (_: any, { id, input }: { id: string; input: { name?: string; description?: string | null } }) => {
    const categoryRepository = AppDataSource.getRepository(Category)

    const category = await categoryRepository.findOne({ where: { categoryId: parseInt(id) } })
    if (!category) {
      throw new NotFoundError(Messages.CATEGORY_NOT_FOUND)
    }

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new ValidationError(Messages.CATEGORY_NAME_EMPTY, 'name')
      }

      if (input.name.length > 200) {
        throw new ValidationError(Messages.CATEGORY_NAME_TOO_LONG, 'name')
      }

      const existingCategory = await categoryRepository.findOne({
        where: { name: input.name.trim() }
      })
      if (existingCategory && existingCategory.categoryId !== category.categoryId) {
        throw new ValidationError(Messages.CATEGORY_NAME_EXISTS, 'name')
      }

      category.name = input.name.trim()
    }

    if (input.description !== undefined) {
      if (input.description !== null && input.description.length > 500) {
        throw new ValidationError(Messages.CATEGORY_DESCRIPTION_TOO_LONG, 'description')
      }

      category.description = (input.description ?? null) as any
    }

    return await categoryRepository.save(category)
  }),

  deleteCategory: requirePermission(Permission.MANAGE_CATEGORIES)(async (_: any, { id }: { id: string }) => {
    const categoryRepository = AppDataSource.getRepository(Category)

    const category = await categoryRepository.findOne({
      where: { categoryId: parseInt(id) },
      relations: ['products']
    })

    if (!category) {
      throw new NotFoundError(Messages.CATEGORY_NOT_FOUND)
    }

    if (category.products && category.products.length > 0) {
      throw new ValidationError('Cannot delete category that contains products', 'categoryId')
    }

    await categoryRepository.remove(category)
    return true
  })
}
