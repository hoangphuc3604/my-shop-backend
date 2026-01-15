import { AppDataSource } from '../../../config/database'
import { Promotion, PromotionType, AppliesTo } from '../../../entities/Promotion'
import { requirePermission } from '../../../middleware/authorization'
import { Permission } from '../../../entities/User'
import { ValidationError, NotFoundError, BadRequestError } from '../../../utils/errors/CustomErrors'
import { Messages } from '../../../utils/messages'

export const promotionMutations = {
  createPromotion: requirePermission(Permission.MANAGE_SYSTEM)(async (_: any, { input }: { input: { code: string; description: string; discountType: PromotionType; discountValue: number; appliesTo: AppliesTo; appliesToIds?: number[]; startAt?: string; endAt?: string; usageLimit?: number; perUserLimit?: number } }) => {
    const promotionRepository = AppDataSource.getRepository(Promotion)

    if (input.code.trim().length === 0) {
      throw new ValidationError('Promotion code cannot be empty', 'code')
    }

    if (input.code.length > 50) {
      throw new ValidationError('Promotion code cannot exceed 50 characters', 'code')
    }

    if (!/^[A-Z0-9_]+$/.test(input.code)) {
      throw new ValidationError('Promotion code must be uppercase letters, numbers, and underscores only', 'code')
    }

    const existingPromotion = await promotionRepository.findOne({ where: { code: input.code } })
    if (existingPromotion) {
      throw new ValidationError('Promotion code already exists', 'code')
    }

    if (input.discountValue <= 0) {
      throw new ValidationError('Discount value must be greater than 0', 'discountValue')
    }

    if (input.discountType === PromotionType.PERCENTAGE && input.discountValue > 100) {
      throw new ValidationError('Percentage discount cannot exceed 100%', 'discountValue')
    }

    if (input.appliesTo !== AppliesTo.ALL && (!input.appliesToIds || input.appliesToIds.length === 0)) {
      throw new ValidationError('appliesToIds is required when appliesTo is not ALL', 'appliesToIds')
    }

    if (input.startAt && input.endAt) {
      const startDate = new Date(input.startAt)
      const endDate = new Date(input.endAt)
      if (startDate >= endDate) {
        throw new ValidationError('Start date must be before end date', 'startAt')
      }
    }

    const promotion = promotionRepository.create({
      code: input.code.toUpperCase(),
      description: input.description,
      discountType: input.discountType,
      discountValue: input.discountValue,
      appliesTo: input.appliesTo,
      appliesToIds: input.appliesToIds || null,
      startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null,
      usageLimit: input.usageLimit || null,
      perUserLimit: input.perUserLimit || null
    })

    return await promotionRepository.save(promotion)
  }),

  updatePromotion: requirePermission(Permission.MANAGE_SYSTEM)(async (_: any, { id, input }: { id: string; input: { code?: string; description?: string; discountType?: PromotionType; discountValue?: number; appliesTo?: AppliesTo; appliesToIds?: number[]; startAt?: string; endAt?: string; isActive?: boolean; usageLimit?: number; perUserLimit?: number } }) => {
    const promotionRepository = AppDataSource.getRepository(Promotion)
    const promotion = await promotionRepository.findOneBy({ promotionId: parseInt(id) })

    if (!promotion) {
      throw new NotFoundError('Promotion not found')
    }

    if (input.code !== undefined) {
      if (input.code.trim().length === 0) {
        throw new ValidationError('Promotion code cannot be empty', 'code')
      }

      if (input.code.length > 50) {
        throw new ValidationError('Promotion code cannot exceed 50 characters', 'code')
      }

      if (!/^[A-Z0-9_]+$/.test(input.code)) {
        throw new ValidationError('Promotion code must be uppercase letters, numbers, and underscores only', 'code')
      }

      const existingPromotion = await promotionRepository.findOne({
        where: { code: input.code, promotionId: promotion.promotionId }
      })
      if (existingPromotion) {
        throw new ValidationError('Promotion code already exists', 'code')
      }

      promotion.code = input.code.toUpperCase()
    }

    if (input.description !== undefined) {
      promotion.description = input.description
    }

    if (input.discountType !== undefined) {
      promotion.discountType = input.discountType
    }

    if (input.discountValue !== undefined) {
      if (input.discountValue <= 0) {
        throw new ValidationError('Discount value must be greater than 0', 'discountValue')
      }

      if (input.discountType === PromotionType.PERCENTAGE && input.discountValue > 100) {
        throw new ValidationError('Percentage discount cannot exceed 100%', 'discountValue')
      }

      promotion.discountValue = input.discountValue
    }

    if (input.appliesTo !== undefined) {
      promotion.appliesTo = input.appliesTo
    }

    if (input.appliesToIds !== undefined) {
      if (input.appliesTo !== AppliesTo.ALL && (!input.appliesToIds || input.appliesToIds.length === 0)) {
        throw new ValidationError('appliesToIds is required when appliesTo is not ALL', 'appliesToIds')
      }
      promotion.appliesToIds = input.appliesToIds
    }

    if (input.startAt !== undefined) {
      promotion.startAt = input.startAt ? new Date(input.startAt) : null
    }

    if (input.endAt !== undefined) {
      promotion.endAt = input.endAt ? new Date(input.endAt) : null
    }

    if (input.startAt && input.endAt) {
      const startDate = new Date(input.startAt)
      const endDate = new Date(input.endAt)
      if (startDate >= endDate) {
        throw new ValidationError('Start date must be before end date', 'startAt')
      }
    }

    if (input.isActive !== undefined) {
      promotion.isActive = input.isActive
    }

    if (input.usageLimit !== undefined) {
      promotion.usageLimit = input.usageLimit
    }

    if (input.perUserLimit !== undefined) {
      promotion.perUserLimit = input.perUserLimit
    }

    return await promotionRepository.save(promotion)
  }),

  deletePromotion: requirePermission(Permission.MANAGE_SYSTEM)(async (_: any, { id }: { id: string }) => {
    const promotionRepository = AppDataSource.getRepository(Promotion)
    const promotion = await promotionRepository.findOneBy({ promotionId: parseInt(id) })

    if (!promotion) {
      throw new NotFoundError('Promotion not found')
    }

    await promotionRepository.remove(promotion)
    return true
  })
}
