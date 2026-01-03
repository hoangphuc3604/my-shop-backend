# ⚡ GraphQL Mutations

Trang này mô tả chi tiết tất cả các **Mutation operations** có sẵn trong API My Shop.

## 📋 Danh Sách Mutations

| Mutation | Mô tả | Quyền | Tham số |
|----------|-------|-------|---------|
| [`register`](#register) | Đăng ký tài khoản mới | Không cần | RegisterInput |
| [`login`](#login) | Đăng nhập | Không cần | LoginInput |
| [`addOrder`](#addorder) | Tạo đơn hàng mới | Đã đăng nhập + Admin | CreateOrderInput |
| [`updateOrder`](#updateorder) | Cập nhật trạng thái đơn hàng | Đã đăng nhập + Admin | id, UpdateOrderInput |
| [`deleteOrder`](#deleteorder) | Xóa đơn hàng | Đã đăng nhập + Admin | id |

---

## register

**Mô tả**: Đăng ký tài khoản người dùng mới.

**Quyền**: Không yêu cầu authentication

**Tham số**: `RegisterInput`
- `username`: String! - Tên đăng nhập (duy nhất)
- `email`: String! - Email (duy nhất)
- `password`: String! - Mật khẩu

**Kiểu trả về**: `AuthResponse!`

**Validation Rules**:
- Username: 3-50 ký tự, chỉ chữ cái, số, dấu gạch dưới
- Email: Định dạng email hợp lệ
- Password: Tối thiểu 6 ký tự

**Ví dụ**:
```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    success
    token
    user {
      userId
      username
      email
      role
      createdAt
    }
    message
  }
}
```

**Variables**:
```json
{
  "input": {
    "username": "nguyenvana",
    "email": "nguyenvana@example.com",
    "password": "password123"
  }
}
```

**Response thành công**:
```json
{
  "data": {
    "register": {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "userId": 1,
        "username": "nguyenvana",
        "email": "nguyenvana@example.com",
        "role": "SALE",
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      "message": "User registered successfully"
    }
  }
}
```

**Response lỗi (username đã tồn tại)**:
```json
{
  "data": {
    "register": {
      "success": false,
      "token": null,
      "user": null,
      "message": "Username or email already exists"
    }
  }
}
```

---

## login

**Mô tả**: Đăng nhập vào hệ thống và nhận JWT token.

**Quyền**: Không yêu cầu authentication

**Tham số**: `LoginInput`
- `username`: String! - Tên đăng nhập
- `password`: String! - Mật khẩu

**Kiểu trả về**: `AuthResponse!`

**Ví dụ**:
```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    success
    token
    user {
      userId
      username
      email
      role
      lastLogin
      isActive
    }
    message
  }
}
```

**Variables**:
```json
{
  "input": {
    "username": "admin",
    "password": "admin123"
  }
}
```

**Response thành công**:
```json
{
  "data": {
    "login": {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "userId": 1,
        "username": "admin",
        "email": "admin@example.com",
        "role": "ADMIN",
        "lastLogin": "2024-01-15T10:30:00.000Z",
        "isActive": true
      },
      "message": "Login successful"
    }
  }
}
```

**Các lỗi có thể xảy ra**:
- `"Invalid username or password"`
- `"Account is inactive"`

---

## addOrder

**Mô tả**: Tạo đơn hàng mới với danh sách sản phẩm.

**Quyền**: Đã đăng nhập + `ADMIN` role

**Tham số**: `CreateOrderInput`
- `orderItems`: [OrderItemInput!]! - Danh sách sản phẩm trong đơn hàng

**OrderItemInput**:
- `productId`: Int! - ID sản phẩm
- `quantity`: Int! - Số lượng

**Kiểu trả về**: `Order!`

**Business Rules**:
- Chỉ Admin mới có thể tạo đơn hàng
- Sản phẩm phải tồn tại trong kho
- Số lượng phải > 0
- Phải có đủ hàng trong kho
- Đơn hàng mặc định có trạng thái `Created`

**Ví dụ**:
```graphql
mutation AddOrder($input: CreateOrderInput!) {
  addOrder(input: $input) {
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
}
```

**Variables (tạo đơn hàng với 2 sản phẩm)**:
```json
{
  "input": {
    "orderItems": [
      {
        "productId": 1,
        "quantity": 2
      },
      {
        "productId": 3,
        "quantity": 1
      }
    ]
  }
}
```

**Response**:
```json
{
  "data": {
    "addOrder": {
      "orderId": 1,
      "createdTime": "2024-01-15T10:30:00.000Z",
      "finalPrice": 450000,
      "status": "Created",
      "orderItems": [
        {
          "orderItemId": 1,
          "quantity": 2,
          "unitSalePrice": 150000,
          "totalPrice": 300000,
          "product": {
            "productId": 1,
            "name": "Áo thun nam",
            "sku": "AT001"
          }
        },
        {
          "orderItemId": 2,
          "quantity": 1,
          "unitSalePrice": 150000,
          "totalPrice": 150000,
          "product": {
            "productId": 3,
            "name": "Quần jean",
            "sku": "QJ001"
          }
        }
      ]
    }
  }
}
```

**Các lỗi có thể xảy ra**:
- `"Some products not found"`
- `"Insufficient stock for product X. Available: Y"`
- `"Only admin can create orders"`

---

## updateOrder

**Mô tả**: Cập nhật trạng thái của đơn hàng.

**Quyền**: Đã đăng nhập + `ADMIN` role

**Tham số**:
- `id`: ID! - ID của đơn hàng
- `input`: UpdateOrderInput! - Dữ liệu cập nhật

**UpdateOrderInput**:
- `status`: OrderStatus! - Trạng thái mới

**Order Status Flow**:
- `Created` → `Paid` hoặc `Cancelled`
- `Paid` hoặc `Cancelled` → **Không thể thay đổi** (đơn hàng đã hoàn tất)

**Ví dụ**:
```graphql
mutation UpdateOrder($id: ID!, $input: UpdateOrderInput!) {
  updateOrder(id: $id, input: $input) {
    orderId
    status
    createdTime
    finalPrice
    orderItems {
      product {
        name
      }
      quantity
      totalPrice
    }
  }
}
```

**Variables (đánh dấu đơn hàng đã thanh toán)**:
```json
{
  "id": "1",
  "input": {
    "status": "Paid"
  }
}
```

**Các lỗi có thể xảy ra**:
- `"Order not found"`
- `"Order status is final and cannot be changed"`
- `"Created orders can only transition to Paid or Cancelled"`
- `"Only admin can update orders"`

---

## deleteOrder

**Mô tả**: Xóa đơn hàng (chỉ đơn hàng ở trạng thái `Created`).

**Quyền**: Đã đăng nhập + `ADMIN` role

**Tham số**:
- `id`: ID! - ID của đơn hàng cần xóa

**Kiểu trả về**: `Boolean!`

**Business Rules**:
- Chỉ có thể xóa đơn hàng ở trạng thái `Created`
- Khi xóa, số lượng sản phẩm sẽ được hoàn trả vào kho
- Đơn hàng đã `Paid` hoặc `Cancelled` không thể xóa

**Ví dụ**:
```graphql
mutation DeleteOrder($id: ID!) {
  deleteOrder(id: $id)
}
```

**Variables**:
```json
{
  "id": "1"
}
```

**Response**:
```json
{
  "data": {
    "deleteOrder": true
  }
}
```

**Các lỗi có thể xảy ra**:
- `"Order not found"`
- `"Can only delete orders with status 'Created'"`
- `"Only admin can delete orders"`

---

## 🔐 Quyền Truy Cập

| Mutation | Admin | Sale | Guest |
|----------|-------|------|-------|
| register | ✅ | ✅ | ✅ |
| login | ✅ | ✅ | ✅ |
| addOrder | ✅ | ❌ | ❌ |
| updateOrder | ✅ | ❌ | ❌ |
| deleteOrder | ✅ | ❌ | ❌ |

## 📝 Lưu Ý Quan Trọng

### Authentication
- Sau khi `login` thành công, sử dụng token trong header:
  ```
  Authorization: Bearer <token>
  ```

### Order Management
- Chỉ Admin mới có thể quản lý đơn hàng
- Đơn hàng có workflow nghiêm ngặt (Created → Paid/Cancelled)
- Xóa đơn hàng sẽ hoàn trả sản phẩm vào kho

### Error Handling
- Tất cả mutations đều trả về structured errors
- Kiểm tra trường `success` và `message` trong response

### Data Validation
- Username và email phải duy nhất
- Password tối thiểu 6 ký tự
- Sản phẩm phải có đủ tồn kho khi tạo đơn hàng
