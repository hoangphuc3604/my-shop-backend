import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm'
import { OrderItem } from './OrderItem'
import { User } from './User'

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  orderId!: number

  @Column({ type: 'int' })
  userId!: number

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User

  @CreateDateColumn()
  createdTime!: Date

  @Column({ type: 'int', default: 0 })
  finalPrice!: number

  @Column({ length: 50, default: 'Created' })
  status!: string

  @OneToMany(() => OrderItem, orderItem => orderItem.order, { cascade: true })
  orderItems!: OrderItem[]
}
