import { gql } from 'apollo-server'

export const typeDefs = gql`
  type User {
    userId: ID!
    username: String!
    email: String!
    role: String!
    createdAt: String!
    lastLogin: String
    isActive: Boolean!
  }

  type Category {
    categoryId: ID!
    name: String!
    description: String
    products: [Product!]!
  }

  type Product {
    productId: ID!
    sku: String!
    name: String!
    importPrice: Int
    count: Int!
    description: String
    images: [ProductImage!]!
    categoryId: Int!
    category: Category!
    orderItems: [OrderItem!]!
  }

  type ProductImage {
    productImageId: ID!
    url: String!
    altText: String
    position: Int!
    isPrimary: Boolean!
  }

  type Order {
    orderId: ID!
    createdTime: String!
    finalPrice: Int!
    status: OrderStatus!
    orderItems: [OrderItem!]!
  }

  type OrderItem {
    orderItemId: ID!
    quantity: Int!
    unitSalePrice: Float!
    totalPrice: Int!
    orderId: Int!
    productId: Int!
    order: Order!
    product: Product!
  }

  type PaginationInfo {
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
    limit: Int!
    hasNextPage: Boolean!
    hasPrevPage: Boolean!
  }

  type PaginatedUsers {
    items: [User!]!
    pagination: PaginationInfo!
  }

  type PaginatedCategories {
    items: [Category!]!
    pagination: PaginationInfo!
  }

  type PaginatedProducts {
    items: [Product!]!
    pagination: PaginationInfo!
  }

  type PaginatedOrders {
    items: [Order!]!
    pagination: PaginationInfo!
  }

  enum OrderStatus {
    "Order has been created and is waiting for payment"
    Created
    "Order has been paid"
    Paid
    "Order has been cancelled"
    Cancelled
  }

  enum ProductSortBy {
    "Sắp xếp theo tên sản phẩm"
    NAME
    "Sắp xếp theo giá nhập"
    IMPORT_PRICE
    "Sắp xếp theo số lượng tồn kho"
    COUNT
    "Sắp xếp theo ngày tạo"
    CREATED_AT
    "Sắp xếp theo ID sản phẩm"
    PRODUCT_ID
  }

  enum SortOrder {
    "Sắp xếp tăng dần (A-Z, 1-9)"
    ASC
    "Sắp xếp giảm dần (Z-A, 9-1)"
    DESC
  }

  type AuthResponse {
    success: Boolean!
    token: String
    user: User
    message: String!
  }

  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    username: String!
    password: String!
  }

  input ListParams {
    search: String
    page: Int
    limit: Int
    "Date format: YYYY-MM-DD (e.g., 2024-01-15)"
    startDate: String
    "Date format: YYYY-MM-DD (e.g., 2024-12-31)"
    endDate: String
  }

  input ProductListParams {
    "Từ khóa tìm kiếm trong tên, SKU hoặc mô tả sản phẩm"
    search: String
    "Trang hiện tại (bắt đầu từ 1)"
    page: Int
    "Số sản phẩm trên mỗi trang (mặc định: 10)"
    limit: Int
    "Tiêu chí sắp xếp"
    sortBy: ProductSortBy
    "Thứ tự sắp xếp"
    sortOrder: SortOrder
    "Giá tối thiểu (VNĐ)"
    minPrice: Int
    "Giá tối đa (VNĐ)"
    maxPrice: Int
  }

  input OrderItemInput {
    productId: Int!
    quantity: Int!
  }

  input CreateOrderInput {
    orderItems: [OrderItemInput!]!
  }

  input UpdateOrderInput {
    status: OrderStatus!
  }

  input CreateProductInput {
    sku: String!
    name: String!
    importPrice: Int!
    count: Int!
    description: String
    images: [ImageInput!]!
    categoryId: Int!
  }

  input UpdateProductInput {
    sku: String
    name: String
    importPrice: Int
    count: Int
    description: String
    images: [ImageInput!]
    categoryId: Int
  }

  input CreateCategoryInput {
    name: String!
    description: String
  }

  input UpdateCategoryInput {
    name: String
    description: String
  }

  input ImageInput {
    url: String!
    altText: String
    position: Int
    isPrimary: Boolean
  }

  type Query {
    hello: String!
    users(params: ListParams): PaginatedUsers!
    user(id: ID!): User
    categories(params: ListParams): PaginatedCategories!
    category(id: ID!): Category
    products(params: ProductListParams): PaginatedProducts!
    product(id: ID!): Product
    orders(params: ListParams): PaginatedOrders!
    order(id: ID!): Order
    me: User
    productTemplate: TemplateFileResult!
    dashboardStats: DashboardStats!
  }

  type BulkUploadResult {
    createdCount: Int!
    failedCount: Int!
    errors: [BulkRowError!]!
  }

  type BulkRowError {
    row: Int!
    message: String!
    field: String
  }

  type TemplateFileResult {
    fileBase64: String!
    filename: String!
    mimeType: String!
  }

  type LowStockProduct {
    productId: ID!
    sku: String!
    name: String!
    count: Int!
    importPrice: Int
  }

  type TopSellingProduct {
    productId: ID!
    sku: String!
    name: String!
    totalSold: Int!
  }

  type RecentOrder {
    orderId: ID!
    createdTime: String!
    finalPrice: Int!
    status: OrderStatus!
    user: UserBasic!
    orderItems: [OrderItemBasic!]!
  }

  type UserBasic {
    username: String!
  }

  type OrderItemBasic {
    quantity: Int!
    unitSalePrice: Float!
    totalPrice: Int!
    product: ProductBasic!
  }

  type ProductBasic {
    name: String!
    sku: String!
  }

  type RevenueChartData {
    date: String!
    revenue: Int!
  }

  type DashboardStats {
    totalProducts: Int!
    lowStockProducts: [LowStockProduct!]!
    topSellingProducts: [TopSellingProduct!]!
    todayOrdersCount: Int!
    todayRevenue: Int!
    recentOrders: [RecentOrder!]!
    monthlyRevenueChart: [RevenueChartData!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthResponse!
    login(input: LoginInput!): AuthResponse!
    addOrder(input: CreateOrderInput!): Order!
    updateOrder(id: ID!, input: UpdateOrderInput!): Order!
    deleteOrder(id: ID!): Boolean!
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
    bulkCreateProducts(fileBase64: String!): BulkUploadResult!
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!
  }
`
