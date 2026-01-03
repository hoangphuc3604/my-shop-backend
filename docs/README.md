# 📖 Hướng Dẫn API My Shop Backend

Chào mừng bạn đến với tài liệu API của **My Shop Backend** - một hệ thống quản lý cửa hàng sử dụng GraphQL.

## 🚀 Bắt Đầu Nhanh

### Endpoint chính
```
POST https://my-shop-backend-fb9q.onrender.com/graphql
GET  https://my-shop-backend-fb9q.onrender.com/graphql?query={hello}
```

### Ping để giữ server không tắt (dành cho Render)
```
GET https://my-shop-backend-fb9q.onrender.com/graphql?query={hello}
```

## 📋 Tổng Quan

API này cung cấp các chức năng quản lý:
- 👤 **Người dùng**: Đăng ký, đăng nhập, quản lý tài khoản
- 📦 **Sản phẩm**: Quản lý danh mục sản phẩm với tìm kiếm, sắp xếp, lọc
- 🛒 **Đơn hàng**: Tạo và quản lý đơn hàng
- 📂 **Danh mục**: Quản lý danh mục sản phẩm

## 🔐 Authentication

Hầu hết các API yêu cầu xác thực bằng JWT token:
```
Authorization: Bearer <your-jwt-token>
```

## 📚 Cấu Trúc Tài Liệu

| File | Mô tả |
|------|-------|
| [queries.md](./queries.md) | Chi tiết tất cả Query operations |
| [mutations.md](./mutations.md) | Chi tiết tất cả Mutation operations |
| [types.md](./types.md) | Mô tả các Types và Input types |
| [examples.md](./examples.md) | Ví dụ sử dụng thực tế |

## 🏗️ Kiến Trúc

### GraphQL Schema
- **Query**: Lấy dữ liệu (Read operations)
- **Mutation**: Thay đổi dữ liệu (Create, Update, Delete operations)
- **Subscription**: Theo dõi thay đổi real-time (chưa triển khai)

### Phân Trang (Pagination)
Tất cả danh sách đều hỗ trợ phân trang với cấu trúc:
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

### Mã Lỗi (Error Handling)
API trả về lỗi theo chuẩn GraphQL với các loại lỗi phổ biến:
- `VALIDATION_ERROR`: Dữ liệu đầu vào không hợp lệ
- `NOT_FOUND_ERROR`: Không tìm thấy tài nguyên
- `PERMISSION_ERROR`: Không có quyền truy cập
- `BAD_REQUEST_ERROR`: Yêu cầu không hợp lệ

## 🛠️ Công Cụ Phát Triển

### GraphQL Playground
Truy cập `https://my-shop-backend-fb9q.onrender.com/graphql` để sử dụng GraphQL Playground - công cụ trực quan để test API.

### Postman/Insomnia
Sử dụng REST client với GraphQL body:
```
POST /graphql
Content-Type: application/json

{
  "query": "query { hello }",
  "variables": {}
}
```

## 🔍 Tìm Kiếm & Lọc

### Sản Phẩm
- **Tìm kiếm**: Theo tên, SKU, mô tả
- **Lọc giá**: Khoảng giá tối thiểu/tối đa
- **Sắp xếp**: Theo tên, giá, số lượng, ngày tạo, ID

### Đơn Hàng
- **Lọc theo ngày**: Khoảng thời gian tạo đơn
- **Lọc theo trạng thái**: Created, Paid, Cancelled

## 📊 Ví Dụ Sử Dung Nhanh

### 1. Ping Server
```graphql
query { hello }
```

### 2. Đăng Nhập
```graphql
mutation {
  login(input: { username: "admin", password: "password" }) {
    token
    user { username role }
  }
}
```

### 3. Lấy Danh Sách Sản Phẩm
```graphql
query {
  products(params: { sortBy: IMPORT_PRICE, sortOrder: ASC }) {
    items { name importPrice }
    pagination { totalCount currentPage }
  }
}
```

---

📖 **Khám phá thêm**: Đọc [queries.md](./queries.md) để xem chi tiết tất cả các API có sẵn!
