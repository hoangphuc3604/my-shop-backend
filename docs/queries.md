# 🔍 GraphQL Queries

Trang này mô tả chi tiết tất cả các **Query operations** có sẵn trong API My Shop.

## 📋 Danh Sách Queries

| Query | Mô tả | Quyền | Tham số |
|-------|-------|-------|---------|
| [`hello`](#hello) | Ping server | Không cần | Không |
| [`users`](#users) | Danh sách người dùng | MANAGE_USERS | ListParams |
| [`user`](#user) | Chi tiết người dùng | MANAGE_USERS | id |
| [`categories`](#categories) | Danh sách danh mục | READ_CATEGORIES | ListParams |
| [`category`](#category) | Chi tiết danh mục | READ_CATEGORIES | id |
| [`products`](#products) | Danh sách sản phẩm | READ_PRODUCTS | ProductListParams |
| [`product`](#product) | Chi tiết sản phẩm | READ_PRODUCTS | id |
| [`orders`](#orders) | Danh sách đơn hàng | READ_ORDERS | ListParams |
| [`order`](#order) | Chi tiết đơn hàng | READ_ORDERS | id |
| [`me`](#me) | Thông tin tài khoản hiện tại | Đã đăng nhập | Không |

---

## hello

**Mô tả**: Query đơn giản để ping server và kiểm tra trạng thái hoạt động.

**Quyền**: Không yêu cầu authentication

**Tham số**: Không có

**Kiểu trả về**: `String!`

**Ví dụ**:
```graphql
query {
  hello
}
```

**Response**:
```json
{
  "data": {
    "hello": "Hello, World!"
  }
}
```

---

## users

**Mô tả**: Lấy danh sách người dùng với phân trang và tìm kiếm.

**Quyền**: `MANAGE_USERS` (chỉ Admin)

**Tham số**: `ListParams`
- `search`: String - Tìm kiếm theo username hoặc email
- `page`: Int - Trang hiện tại (mặc định: 1)
- `limit`: Int - Số items/trang (mặc định: 10)

**Kiểu trả về**: `PaginatedUsers!`

**Ví dụ**:
```graphql
query GetUsers($params: ListParams) {
  users(params: $params) {
    items {
      userId
      username
      email
      role
      createdAt
      lastLogin
      isActive
    }
    pagination {
      totalCount
      currentPage
      totalPages
      limit
      hasNextPage
      hasPrevPage
    }
  }
}
```

**Variables**:
```json
{
  "params": {
    "search": "admin",
    "page": 1,
    "limit": 10
  }
}
```

---

## user

**Mô tả**: Lấy thông tin chi tiết của một người dùng cụ thể.

**Quyền**: `MANAGE_USERS` (chỉ Admin)

**Tham số**:
- `id`: ID! - ID của người dùng

**Kiểu trả về**: `User` (có thể null nếu không tìm thấy)

**Ví dụ**:
```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    userId
    username
    email
    role
    createdAt
    lastLogin
    isActive
  }
}
```

**Variables**:
```json
{
  "id": "1"
}
```

---

## categories

**Mô tả**: Lấy danh sách danh mục sản phẩm với phân trang và tìm kiếm.

**Quyền**: `READ_CATEGORIES`

**Tham số**: `ListParams`
- `search`: String - Tìm kiếm theo tên hoặc mô tả danh mục
- `page`: Int - Trang hiện tại (mặc định: 1)
- `limit`: Int - Số items/trang (mặc định: 10)

**Kiểu trả về**: `PaginatedCategories!`

**Ví dụ**:
```graphql
query GetCategories($params: ListParams) {
  categories(params: $params) {
    items {
      categoryId
      name
      description
      products {
        productId
        name
      }
    }
    pagination {
      totalCount
      currentPage
      totalPages
      limit
      hasNextPage
      hasPrevPage
    }
  }
}
```

---

## category

**Mô tả**: Lấy thông tin chi tiết của một danh mục cụ thể.

**Quyền**: `READ_CATEGORIES`

**Tham số**:
- `id`: ID! - ID của danh mục

**Kiểu trả về**: `Category` (có thể null nếu không tìm thấy)

**Ví dụ**:
```graphql
query GetCategory($id: ID!) {
  category(id: $id) {
    categoryId
    name
    description
    products {
      productId
      name
      importPrice
      count
    }
  }
}
```

---

## products

**Mô tả**: Lấy danh sách sản phẩm với tìm kiếm, lọc, sắp xếp và phân trang.

**Quyền**: `READ_PRODUCTS`

**Tham số**: `ProductListParams`
- `search`: String - Tìm kiếm theo tên, SKU, mô tả
- `page`: Int - Trang hiện tại (mặc định: 1)
- `limit`: Int - Số items/trang (mặc định: 10)
- `sortBy`: ProductSortBy - Tiêu chí sắp xếp
- `sortOrder`: SortOrder - Thứ tự sắp xếp
- `minPrice`: Int - Giá tối thiểu (VNĐ)
- `maxPrice`: Int - Giá tối đa (VNĐ)

**Kiểu trả về**: `PaginatedProducts!`

**Ví dụ cơ bản**:
```graphql
query GetProducts($params: ProductListParams) {
  products(params: $params) {
    items {
      productId
      sku
      name
      importPrice
      count
      description
      imageUrl1
      imageUrl2
      imageUrl3
      category {
        categoryId
        name
      }
    }
    pagination {
      totalCount
      currentPage
      totalPages
      limit
      hasNextPage
      hasPrevPage
    }
  }
}
```

**Ví dụ tìm áo giá từ 200k-1tr, sắp xếp theo giá giảm dần**:
```json
{
  "params": {
    "search": "áo",
    "minPrice": 200000,
    "maxPrice": 1000000,
    "sortBy": "IMPORT_PRICE",
    "sortOrder": "DESC"
  }
}
```

---

## product

**Mô tả**: Lấy thông tin chi tiết của một sản phẩm cụ thể.

**Quyền**: `READ_PRODUCTS`

**Tham số**:
- `id`: ID! - ID của sản phẩm

**Kiểu trả về**: `Product` (có thể null nếu không tìm thấy)

**Lưu ý**: Người dùng thường (`SALE` role) sẽ không thấy trường `importPrice`.

**Ví dụ**:
```graphql
query GetProduct($id: ID!) {
  product(id: $id) {
    productId
    sku
    name
    importPrice  # Chỉ Admin mới thấy
    count
    description
    imageUrl1
    imageUrl2
    imageUrl3
    category {
      categoryId
      name
    }
    orderItems {
      orderItemId
      quantity
      unitSalePrice
    }
  }
}
```

---

## orders

**Mô tả**: Lấy danh sách đơn hàng với phân trang và lọc.

**Quyền**: `READ_ORDERS`

**Tham số**: `ListParams`
- `search`: String - Tìm kiếm theo trạng thái đơn hàng
- `page`: Int - Trang hiện tại (mặc định: 1)
- `limit`: Int - Số items/trang (mặc định: 10)
- `startDate`: String - Ngày bắt đầu (YYYY-MM-DD)
- `endDate`: String - Ngày kết thúc (YYYY-MM-DD)

**Kiểu trả về**: `PaginatedOrders!`

**Lưu ý**: User thường chỉ thấy đơn hàng của mình, Admin thấy tất cả.

**Ví dụ**:
```graphql
query GetOrders($params: ListParams) {
  orders(params: $params) {
    items {
      orderId
      createdTime
      finalPrice
      status
      orderItems {
        orderItemId
        quantity
        unitSalePrice
        totalPrice
        product {
          productId
          name
          sku
        }
      }
    }
    pagination {
      totalCount
      currentPage
      totalPages
      limit
      hasNextPage
      hasPrevPage
    }
  }
}
```

---

## order

**Mô tả**: Lấy thông tin chi tiết của một đơn hàng cụ thể.

**Quyền**: `READ_ORDERS`

**Tham số**:
- `id`: ID! - ID của đơn hàng

**Kiểu trả về**: `Order` (có thể null nếu không tìm thấy)

**Lưu ý**: User thường chỉ truy cập được đơn hàng của mình.

**Ví dụ**:
```graphql
query GetOrder($id: ID!) {
  order(id: $id) {
    orderId
    createdTime
    finalPrice
    status
    orderItems {
      orderItemId
      quantity
      unitSalePrice
      totalPrice
      product {
        productId
        name
        sku
        description
      }
    }
  }
}
```

---

## me

**Mô tả**: Lấy thông tin của tài khoản hiện tại đang đăng nhập.

**Quyền**: Đã đăng nhập (bất kỳ role nào)

**Tham số**: Không có

**Kiểu trả về**: `User` (thông tin user hiện tại)

**Ví dụ**:
```graphql
query GetCurrentUser {
  me {
    userId
    username
    email
    role
    createdAt
    lastLogin
    isActive
  }
}
```

---

## 🔐 Quyền Truy Cập

| Query | Admin | Sale | Guest |
|-------|-------|------|-------|
| hello | ✅ | ✅ | ✅ |
| users | ✅ | ❌ | ❌ |
| user | ✅ | ❌ | ❌ |
| categories | ✅ | ✅ | ❌ |
| category | ✅ | ✅ | ❌ |
| products | ✅ | ✅ | ❌ |
| product | ✅ | ✅ | ❌ |
| orders | ✅ | ✅ | ❌ |
| order | ✅ | ✅ | ❌ |
| me | ✅ | ✅ | ❌ |

> **Lưu ý**: Guest có thể truy cập `hello` để ping server, nhưng cần đăng nhập để sử dụng hầu hết các API khác.
