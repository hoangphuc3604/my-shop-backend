import { Order } from '../../../entities/Order'
import { formatToGMT7ISO } from '../../../utils/timezone'

export const orderTypes = {
  Order: {
    createdTime: (order: Order) => {
      return order.createdTime instanceof Date ? formatToGMT7ISO(order.createdTime) : formatToGMT7ISO(new Date(String(order.createdTime)))
    }
  }
}

