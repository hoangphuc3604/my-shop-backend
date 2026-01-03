# 📋 GraphQL Types & Inputs

Trang này mô tả chi tiết tất cả các **Types**, **Enums**, và **Input Types** được sử dụng trong API My Shop.

## 🔧 Enums

### OrderStatus
Trạng thái của đơn hàng.

```graphql
enum OrderStatus {
  "Order has been created and is waiting for payment"
  Created
  "Order has been paid"
  Paid
  "Order has been cancelled"
  Cancelled
}
```

### ProductSortBy
Các tiêu chí sắp xếp sản phẩm.

```graphql
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
```

### SortOrder
Thứ tự sắp xếp.

```graphql
enum SortOrder {
  "Sắp xếp tăng dần (A-Z, 1-9)"
  ASC
  "Sắp xếp giảm dần (Z-A, 9-1)"
  DESC
}
```

---

## 🎯 Object Types

### User
Thông tin người dùng.

```graphql
type User {
  userId: ID!
  username: String!
  email: String!
  role: String!
  createdAt: String!
  lastLogin: String
  isActive: Boolean!
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| userId | ID! | ✅ | ID duy nhất của user |
| username | String! | ✅ | Tên đăng nhập |
| email | String! | ✅ | Email |
| role | String! | ✅ | Vai trò (ADMIN, SALE) |
| createdAt | String! | ✅ | Ngày tạo (ISO string) |
| lastLogin | String | ❌ | Lần đăng nhập cuối (ISO string) |
| isActive | Boolean! | ✅ | Trạng thái kích hoạt |

### Category
Thông tin danh mục sản phẩm.

```graphql
type Category {
  categoryId: ID!
  name: String!
  description: String
  products: [Product!]!
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| categoryId | ID! | ✅ | ID duy nhất của danh mục |
| name | String! | ✅ | Tên danh mục |
| description | String | ❌ | Mô tả danh mục |
| products | [Product!]! | ✅ | Danh sách sản phẩm trong danh mục |

### Product
Thông tin sản phẩm.

```graphql
type Product {
  productId: ID!
  sku: String!
  name: String!
  importPrice: Int
  count: Int!
  description: String!
  imageUrl1: String!
  imageUrl2: String!
  imageUrl3: String!
  categoryId: Int!
  category: Category!
  orderItems: [OrderItem!]!
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| productId | ID! | ✅ | ID duy nhất của sản phẩm |
| sku | String! | ✅ | Mã SKU duy nhất |
| name | String! | ✅ | Tên sản phẩm |
| importPrice | Int | ❌ | Giá nhập (chỉ Admin thấy) |
| count | Int! | ✅ | Số lượng tồn kho |
| description | String! | ✅ | Mô tả sản phẩm |
| imageUrl1 | String! | ✅ | URL ảnh 1 |
| imageUrl2 | String! | ✅ | URL ảnh 2 |
| imageUrl3 | String! | ✅ | URL ảnh 3 |
| categoryId | Int! | ✅ | ID danh mục |
| category | Category! | ✅ | Thông tin danh mục |
| orderItems | [OrderItem!]! | ✅ | Danh sách items trong đơn hàng |

### Order
Thông tin đơn hàng.

```graphql
type Order {
  orderId: ID!
  createdTime: String!
  finalPrice: Int!
  status: OrderStatus!
  orderItems: [OrderItem!]!
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| orderId | ID! | ✅ | ID duy nhất của đơn hàng |
| createdTime | String! | ✅ | Thời gian tạo (ISO string) |
| finalPrice | Int! | ✅ | Tổng tiền (VNĐ) |
| status | OrderStatus! | ✅ | Trạng thái đơn hàng |
| orderItems | [OrderItem!]! | ✅ | Chi tiết các items |

### OrderItem
Chi tiết một item trong đơn hàng.

```graphql
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
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| orderItemId | ID! | ✅ | ID duy nhất của order item |
| quantity | Int! | ✅ | Số lượng |
| unitSalePrice | Float! | ✅ | Giá bán đơn vị |
| totalPrice | Int! | ✅ | Tổng tiền cho item này |
| orderId | Int! | ✅ | ID đơn hàng |
| productId | Int! | ✅ | ID sản phẩm |
| order | Order! | ✅ | Thông tin đơn hàng |
| product | Product! | ✅ | Thông tin sản phẩm |

---

## 📄 Pagination Types

### PaginationInfo
Thông tin phân trang.

```graphql
type PaginationInfo {
  totalCount: Int!
  currentPage: Int!
  totalPages: Int!
  limit: Int!
  hasNextPage: Boolean!
  hasPrevPage: Boolean!
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| totalCount | Int! | ✅ | Tổng số items |
| currentPage | Int! | ✅ | Trang hiện tại |
| totalPages | Int! | ✅ | Tổng số trang |
| limit | Int! | ✅ | Số items/trang |
| hasNextPage | Boolean! | ✅ | Có trang tiếp theo không |
| hasPrevPage | Boolean! | ✅ | Có trang trước không |

### PaginatedUsers
Kết quả phân trang cho danh sách users.

```graphql
type PaginatedUsers {
  items: [User!]!
  pagination: PaginationInfo!
}
```

### PaginatedCategories
Kết quả phân trang cho danh sách categories.

```graphql
type PaginatedCategories {
  items: [Category!]!
  pagination: PaginationInfo!
}
```

### PaginatedProducts
Kết quả phân trang cho danh sách products.

```graphql
type PaginatedProducts {
  items: [Product!]!
  pagination: PaginationInfo!
}
```

### PaginatedOrders
Kết quả phân trang cho danh sách orders.

```graphql
type PaginatedOrders {
  items: [Order!]!
  pagination: PaginationInfo!
}
```

---

## 🔐 Auth Types

### AuthResponse
Response cho các operations authentication.

```graphql
type AuthResponse {
  success: Boolean!
  token: String
  user: User
  message: String!
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| success | Boolean! | ✅ | Thành công hay không |
| token | String | ❌ | JWT token (khi thành công) |
| user | User | ❌ | Thông tin user (khi thành công) |
| message | String! | ✅ | Thông báo |

---

## 📝 Input Types

### RegisterInput
Input cho đăng ký tài khoản.

```graphql
input RegisterInput {
  username: String!
  email: String!
  password: String!
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| username | String! | ✅ | 3-50 chars, chỉ chữ cái/số/_ |
| email | String! | ✅ | Định dạng email hợp lệ |
| password | String! | ✅ | Tối thiểu 6 ký tự |

### LoginInput
Input cho đăng nhập.

```graphql
input LoginInput {
  username: String!
  password: String!
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| username | String! | ✅ | Tên đăng nhập |
| password | String! | ✅ | Mật khẩu |

### ListParams
Input chung cho các danh sách có phân trang.

```graphql
input ListParams {
  search: String
  page: Int
  limit: Int
  "Date format: YYYY-MM-DD (e.g., 2024-01-15)"
  startDate: String
  "Date format: YYYY-MM-DD (e.g., 2024-01-15)"
  endDate: String
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| search | String | ❌ | Từ khóa tìm kiếm |
| page | Int | ❌ | Trang hiện tại (mặc định: 1) |
| limit | Int | ❌ | Số items/trang (mặc định: 10) |
| startDate | String | ❌ | Ngày bắt đầu (YYYY-MM-DD) |
| endDate | String | ❌ | Ngày kết thúc (YYYY-MM-DD) |

### ProductListParams
Input đặc biệt cho danh sách sản phẩm (có sort và filter).

```graphql
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
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| search | String | ❌ | Tìm kiếm theo tên/SKU/mô tả |
| page | Int | ❌ | Trang hiện tại (mặc định: 1) |
| limit | Int | ❌ | Số items/trang (mặc định: 10) |
| sortBy | ProductSortBy | ❌ | Tiêu chí sắp xếp |
| sortOrder | SortOrder | ❌ | Thứ tự sắp xếp (ASC/DESC) |
| minPrice | Int | ❌ | Giá tối thiểu (VNĐ) |
| maxPrice | Int | ❌ | Giá tối đa (VNĐ) |

### OrderItemInput
Input cho một item trong đơn hàng.

```graphql
input OrderItemInput {
  productId: Int!
  quantity: Int!
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| productId | Int! | ✅ | ID sản phẩm hợp lệ |
| quantity | Int! | ✅ | Số lượng > 0 |

### CreateOrderInput
Input để tạo đơn hàng mới.

```graphql
input CreateOrderInput {
  orderItems: [OrderItemInput!]!
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| orderItems | [OrderItemInput!]! | ✅ | Danh sách sản phẩm (ít nhất 1) |

### UpdateOrderInput
Input để cập nhật đơn hàng.

```graphql
input UpdateOrderInput {
  status: OrderStatus!
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| status | OrderStatus! | ✅ | Trạng thái hợp lệ theo workflow |

---

## 🔄 Relationships

### User Roles
- **ADMIN**: Toàn quyền truy cập
- **SALE**: Quyền hạn chế, không thấy giá nhập

### Order Status Flow
```
Created → Paid
Created → Cancelled
(Paid/Cancelled: Final states - không thể thay đổi)
```

### Product Visibility
- **Admin**: Thấy tất cả fields bao gồm `importPrice`
- **Sale**: Không thấy `importPrice` (null)

### Search & Filter Capabilities
- **Users**: Search theo username/email
- **Categories**: Search theo name/description
- **Products**: Search theo name/SKU/description + filter giá + sort
- **Orders**: Filter theo status + date range

---

## 📊 Data Types & Formats

### Primitive Types
- **ID**: String đại diện cho unique identifier
- **String**: Chuỗi UTF-8
- **Int**: Số nguyên 32-bit
- **Float**: Số thực
- **Boolean**: true/false

### Date/Time Format
- **ISO 8601**: `2024-01-15T10:30:00.000Z`
- **Date only**: `2024-01-15` (đối với startDate/endDate)

### Currency
- **VNĐ**: Tất cả giá tiền đều tính bằng VNĐ (không có phần thập phân)
- **Integer**: Giá được lưu dưới dạng số nguyên
