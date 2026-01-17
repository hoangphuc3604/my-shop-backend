import { AppDataSource } from '../../../config/database'
import { Order } from '../../../entities/Order'
import { OrderItem } from '../../../entities/OrderItem'
import { Product } from '../../../entities/Product'
import { Promotion, PromotionType, AppliesTo } from '../../../entities/Promotion'
import { UserRole } from '../../../entities/User'
import { requireAuth, requirePermission } from '../../../middleware/authorization'
import { Permission } from '../../../entities/User'
import { ValidationError, NotFoundError, PermissionError, BadRequestError } from '../../../utils/errors/CustomErrors'
import { Messages } from '../../../utils/messages'

enum OrderStatus {
  Created = 'Created',
  Paid = 'Paid',
  Cancelled = 'Cancelled'
}

export const orderMutations = {
  addOrder: requirePermission(Permission.CREATE_ORDERS)(async (_: any, { input }: { input: { orderItems: Array<{ productId: number; quantity: number }>; promotionCode?: string } }, context: any) => {

    const orderRepository = AppDataSource.getRepository(Order)
    const orderItemRepository = AppDataSource.getRepository(OrderItem)
    const productRepository = AppDataSource.getRepository(Product)
    const promotionRepository = AppDataSource.getRepository(Promotion)

    const targetUserId = context.user.userId

    const productIds = input.orderItems.map(item => item.productId)
    const products = await productRepository.findByIds(productIds)

    if (products.length !== productIds.length) {
      throw new ValidationError(Messages.PRODUCTS_NOT_FOUND)
    }

    const productMap = new Map(products.map(p => [p.productId, p]))

    let totalPrice = 0
    const orderItems: Partial<OrderItem>[] = []

    for (const item of input.orderItems) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new NotFoundError(Messages.PRODUCT_NOT_FOUND)
      }

      if (item.quantity <= 0) {
        throw new ValidationError(Messages.QUANTITY_INVALID, 'quantity')
      }

      if (item.quantity > product.count) {
        throw new ValidationError(Messages.INSUFFICIENT_STOCK(product.name, product.count))
      }

      const unitPrice = product.importPrice
      const itemTotal = Math.round(unitPrice * item.quantity)

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitSalePrice: unitPrice,
        totalPrice: itemTotal
      })

      totalPrice += itemTotal
    }

    let appliedPromotionId: number | null = null
    let appliedPromotionCode: string | null = null
    let discountAmount = 0

    if (input.promotionCode) {
      const promotion = await promotionRepository.findOne({
        where: { code: input.promotionCode.toUpperCase() }
      })

      if (!promotion) {
        throw new ValidationError('Promotion code not found', 'promotionCode')
      }

      if (!promotion.isActive) {
        throw new ValidationError('Promotion is not active', 'promotionCode')
      }

      const now = new Date()
      if (promotion.startAt && now < promotion.startAt) {
        throw new ValidationError('Promotion has not started yet', 'promotionCode')
      }

      if (promotion.endAt && now > promotion.endAt) {
        throw new ValidationError('Promotion has expired', 'promotionCode')
      }

      const applicableProductIds = new Set(products.map(p => p.productId))
      const applicableCategoryIds = new Set(products.map(p => p.categoryId))

      let isApplicable = false
      if (promotion.appliesTo === AppliesTo.ALL) {
        isApplicable = true
      } else if (promotion.appliesTo === AppliesTo.PRODUCTS && promotion.appliesToIds) {
        isApplicable = promotion.appliesToIds.some(id => applicableProductIds.has(id))
      } else if (promotion.appliesTo === AppliesTo.CATEGORIES && promotion.appliesToIds) {
        isApplicable = promotion.appliesToIds.some(id => applicableCategoryIds.has(id))
      }

      if (!isApplicable) {
        throw new ValidationError('Promotion does not apply to any items in your order', 'promotionCode')
      }

      if (promotion.discountType === PromotionType.PERCENTAGE) {
        discountAmount = Math.round(totalPrice * promotion.discountValue / 100)
      } else {
        discountAmount = Math.min(promotion.discountValue, totalPrice)
      }

      const finalPrice = totalPrice - discountAmount

      appliedPromotionId = promotion.promotionId
      appliedPromotionCode = promotion.code
    }

    const finalPrice = totalPrice - discountAmount

    await AppDataSource.transaction(async transactionalEntityManager => {
      const order = orderRepository.create({
        userId: targetUserId,
        finalPrice: finalPrice,
        status: OrderStatus.Created,
        appliedPromotionId,
        appliedPromotionCode,
        discountAmount
      })

      const savedOrder = await transactionalEntityManager.save(Order, order)

      for (const orderItem of orderItems) {
        orderItem.orderId = savedOrder.orderId
      }

      await transactionalEntityManager.save(OrderItem, orderItems)

      for (const item of input.orderItems) {
        const product = productMap.get(item.productId)!
        product.count -= item.quantity
        await transactionalEntityManager.save(Product, product)
      }

    })

    return await orderRepository.findOne({
      where: { orderId: (await orderRepository.findOne({ where: { userId: targetUserId }, order: { orderId: 'DESC' } }))!.orderId },
      relations: ['orderItems', 'orderItems.product']
    })
  }),
  updateOrder: requireAuth()(async (_: any, { id, input }: { id: string; input: { status?: OrderStatus; promotionCode?: string } }, context: any) => {

    const orderRepository = AppDataSource.getRepository(Order)
    const promotionRepository = AppDataSource.getRepository(Promotion)

    const order = await orderRepository.findOne({
      where: { orderId: parseInt(id) },
      relations: ['orderItems', 'orderItems.product']
    })

    if (!order) {
      throw new NotFoundError(Messages.ORDER_NOT_FOUND)
    }

    if (context.user.role !== UserRole.ADMIN && order.userId !== context.user.userId) {
      throw new PermissionError(Messages.ORDER_UPDATE_PERMISSION_DENIED)
    }

    const currentStatus = order.status as OrderStatus
    const newStatus = input.status as OrderStatus

    // Handle promotion update first, if provided
    if (input.promotionCode !== undefined && currentStatus === OrderStatus.Created) {
      let discountAmount = 0
      if (input.promotionCode) {
        const promotion = await promotionRepository.findOne({ where: { code: input.promotionCode.toUpperCase() } })
        if (!promotion) {
          throw new ValidationError('Promotion code not found', 'promotionCode')
        }
        if (!promotion.isActive) {
          throw new ValidationError('Promotion is not active', 'promotionCode')
        }
        const now = new Date()
        if (promotion.startAt && now < promotion.startAt) {
          throw new ValidationError('Promotion has not started yet', 'promotionCode')
        }
        if (promotion.endAt && now > promotion.endAt) {
          throw new ValidationError('Promotion has expired', 'promotionCode')
        }
        const applicableProductIds = new Set(order.orderItems.map(oi => oi.product.productId))
        const applicableCategoryIds = new Set(order.orderItems.map(oi => oi.product.categoryId))
        let isApplicable = false
        if (promotion.appliesTo === AppliesTo.ALL) {
          isApplicable = true
        } else if (promotion.appliesTo === AppliesTo.PRODUCTS && promotion.appliesToIds) {
          isApplicable = promotion.appliesToIds.some(id => applicableProductIds.has(id))
        } else if (promotion.appliesTo === AppliesTo.CATEGORIES && promotion.appliesToIds) {
          isApplicable = promotion.appliesToIds.some(id => applicableCategoryIds.has(id))
        }
        if (!isApplicable) {
          throw new ValidationError('Promotion does not apply to any items in this order', 'promotionCode')
        }
        const totalPrice = order.orderItems.reduce((sum, oi) => sum + oi.totalPrice, 0)
        if (promotion.discountType === PromotionType.PERCENTAGE) {
          discountAmount = Math.round(totalPrice * promotion.discountValue / 100)
        } else {
          discountAmount = Math.min(promotion.discountValue, totalPrice)
        }
        order.appliedPromotionId = promotion.promotionId
        order.appliedPromotionCode = promotion.code
        order.discountAmount = discountAmount
        order.finalPrice = totalPrice - discountAmount
      } else {
        // clear promotion
        const totalPrice = order.orderItems.reduce((sum, oi) => sum + oi.totalPrice, 0)
        order.appliedPromotionId = null
        order.appliedPromotionCode = null
        order.discountAmount = 0
        order.finalPrice = totalPrice
      }
      await orderRepository.save(order)
    }

    if (currentStatus === OrderStatus.Created) {
      if (newStatus === OrderStatus.Created) {
        return order
      }

      if (newStatus !== OrderStatus.Paid && newStatus !== OrderStatus.Cancelled) {
        throw new BadRequestError(Messages.ORDER_STATUS_INVALID_TRANSITION)
      }

      // SALE can update status to Paid or Cancelled for their own orders

      if (newStatus === OrderStatus.Cancelled) {
        await AppDataSource.transaction(async transactionalEntityManager => {
          for (const orderItem of order.orderItems) {
            const product = orderItem.product
            product.count += orderItem.quantity
            await transactionalEntityManager.save(Product, product)
          }

          order.status = newStatus
          await transactionalEntityManager.save(Order, order)
        })

        return order
      }
    } else {
      throw new BadRequestError(Messages.ORDER_STATUS_FINAL)
    }

    order.status = newStatus
    return await orderRepository.save(order)
  }),
  deleteOrder: requireAuth()(async (_: any, { id }: { id: string }, context: any) => {
    if (context.user.role !== UserRole.ADMIN) {
      throw new PermissionError(Messages.ORDER_DELETE_PERMISSION_DENIED)
    }

    const orderRepository = AppDataSource.getRepository(Order)
    const productRepository = AppDataSource.getRepository(Product)

    const order = await orderRepository.findOne({
      where: { orderId: parseInt(id) },
      relations: ['orderItems', 'orderItems.product']
    })

    if (!order) {
      throw new NotFoundError(Messages.ORDER_NOT_FOUND)
    }

    if (order.status !== OrderStatus.Created) {
      throw new BadRequestError(Messages.ORDER_DELETE_INVALID_STATUS)
    }

    await AppDataSource.transaction(async transactionalEntityManager => {
      for (const orderItem of order.orderItems) {
        const product = orderItem.product
        product.count += orderItem.quantity
        await transactionalEntityManager.save(Product, product)
      }

      await transactionalEntityManager.delete(Order, { orderId: order.orderId })
    })

    return true
  })
}
