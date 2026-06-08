# Issue Tracker API

A RESTful API built with **Express.js**, **TypeScript**, and **NeonDB (PostgreSQL)** for managing issues with role-based access control.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: NeonDB (PostgreSQL via `@neondatabase/serverless`)
- **Auth**: JWT (Access & Refresh Tokens)

---

## Getting Started

### Prerequisites

- Node.js v18+
- NeonDB account and connection string

### Installation

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=your_neon_database_url
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
PORT=3000
```

### Run the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## Roles

| Role | Permissions |
|------|-------------|
| `user` | Register, login only |
| `contributor` | Create issues, update own open issues |
| `maintainer` | Full access to all issues |

---

## API Endpoints

### Auth Routes — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/signup` | Public | Register a new user |
| POST | `/login` | Public | Login and receive tokens |
| POST | `/logout` | Public | Logout user |
| GET | `/refresh` | Public | Refresh access token |
| GET | `/me` | Authenticated | Get current user |
| PUT | `/update/:id` | Authenticated | Update user profile |
| DELETE | `/delete/:id` | Authenticated | Delete user account |

---

### Issues Routes — `/api/issues`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/issues` | Contributor, Maintainer | Get all issues |
| POST | `/issues` | Contributor, Maintainer | Create a new issue |
| GET | `/issues/:id` | Contributor, Maintainer | Get a single issue |
| PATCH | `/issues/:id` | Contributor (own, open only), Maintainer | Update an issue |
| DELETE | `/issues/:id` | Maintainer | Delete a single issue |
| DELETE | `/issues/delete-all` | Maintainer | Delete all issues |

---

## Request & Response Format

### Headers (Protected Routes)

```
Authorization: <JWT_TOKEN>
```

### Standard Success Response

```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": "Error details"
}
```

---

## Example Requests

### Signup

```json
POST /api/auth/signup
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123",
  "role": "contributor"
}
```

### Create Issue

```json
POST /api/issues
Authorization: <JWT_TOKEN>

{
  "title": "Database connection timeout",
  "description": "Pool exhausts after 50+ concurrent queries",
  "type": "bug"
}
```

### Update Issue

```json
PATCH /api/issues/:id
Authorization: <JWT_TOKEN>

{
  "title": "Updated title",
  "description": "Updated description",
  "type": "bug"
}
```

---

## Project Structure

```
src/
├── api/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── order.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── order.routes.ts
│   │   └── user.routes.ts
│   └── services/
│       ├── auth.service.ts
│       └── order.service.ts
├── config/
├── db/
├── middleware/
│   ├── globalErrorHandler.ts
│   └── logger.ts
├── types/
│   ├── express.d.ts
│   └── index.ts
├── utils/
│   ├── auth.ts
│   ├── jwt.ts
│   └── sendResponse.ts
└── app.ts
```

---

## License

MIT
