# Krunchies Backend

Production-ready Go backend for the Krunchies Restaurant Management System.

## Run

1. Copy `.env.example` to `.env`
2. Install dependencies with `go mod tidy`
3. Start the server with `go run ./cmd/server`

## Health Check

GET `/`

Response:

```json
{
  "message": "Krunchies Backend Running"
}
```
