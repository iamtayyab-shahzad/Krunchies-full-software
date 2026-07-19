# Krunchies Backend

Gin + GORM + PostgreSQL API for the Krunchies restaurant system.

## Run

```bash
# from backend/
go run ./cmd/server
```

Health: `GET http://localhost:8080/`  
Swagger UI: `http://localhost:8080/swagger/index.html`  
OpenAPI: `http://localhost:8080/openapi.yaml`

## Seed staff user

```bash
go run ./cmd/seed
```

Default credentials: `admin` / `admin123`

## Auth

- `POST /api/v1/auth/staff/login`
- `POST /api/v1/auth/customers/register`
- `POST /api/v1/auth/customers/login`

Staff JWT required for catalog, inventory, payments, analytics, and order management.

## Orders

Public create (guest checkout supported):

- `POST /api/v1/orders` (website/guest)
- `POST /api/v1/orders/phone`
- `POST /api/v1/orders/walkin`

Staff:

- `GET /api/v1/orders`
- `GET /api/v1/orders/pending`
- `GET /api/v1/orders/phone`
- `GET /api/v1/orders/walkin`
- `GET|PUT|DELETE /api/v1/orders/:id`
- `PATCH /api/v1/orders/:id/complete` (consumes inventory via recipes + inventory transactions)
- `PATCH /api/v1/orders/:id/cancel`

Prices, delivery charges, and COD fees are calculated server-side.
