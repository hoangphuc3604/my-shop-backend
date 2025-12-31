import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm'
import { OrderItem } from './OrderItem'

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  orderId!: number

  @CreateDateColumn()
  createdTime!: Date

  @Column({ type: 'int', default: 0 })
  finalPrice!: number

  @Column({ length: 50, default: 'Created' })
  status!: string

  @OneToMany(() => OrderItem, orderItem => orderItem.order, { cascade: true })
  orderItems!: OrderItem[]
}
