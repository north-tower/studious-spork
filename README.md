# Retailer Comparison Backend

A Node.js + Express + TypeScript backend API for comparing retailer delivery options across different countries.

## Tech Stack

- **Node.js** 20+
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Prisma ORM** - Database toolkit
- **Express Validator** - Input validation
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Multer** - File upload handling
- **csv-parser** - CSV file parsing
- **Swagger/OpenAPI** - API documentation

## Features

- User authentication (register, login, JWT)
- Retailer management (CRUD operations)
- Country management
- Delivery data management with bulk CSV upload
- Retailer comparison engine
- Comparison history tracking
- RESTful API design
- Input validation
- Error handling
- CORS support
- Interactive API documentation (Swagger UI)

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
DATABASE_URL="postgresql://user:password@localhost:5432/retailer_comparison?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3000
NODE_ENV=development
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Seed the database (optional):
```bash
npm run prisma:seed
```

### Running the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Documentation

Interactive API documentation is available via Swagger UI:

- **Swagger UI**: `http://localhost:3000/api-docs`

The Swagger documentation provides:
- Complete API endpoint descriptions
- Request/response schemas
- Authentication requirements
- Try-it-out functionality for testing endpoints

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout user (protected)

### Retailers
- `GET /api/retailers` - Get all retailers (optional `?search=query`)
- `GET /api/retailers/:id` - Get specific retailer
- `POST /api/retailers` - Create retailer (protected)
- `PUT /api/retailers/:id` - Update retailer (protected)
- `DELETE /api/retailers/:id` - Delete retailer (protected)

### Countries
- `GET /api/countries` - Get all countries
- `GET /api/countries/:id` - Get specific country
- `POST /api/countries` - Create country (protected)

### Delivery Data
- `GET /api/delivery-data` - Get all delivery data (optional filters: `?retailerId=`, `?countryId=`, `?method=`)
- `GET /api/delivery-data/:id` - Get specific delivery data
- `POST /api/delivery-data` - Create delivery data (protected)
- `PUT /api/delivery-data/:id` - Update delivery data (protected)
- `DELETE /api/delivery-data/:id` - Delete delivery data (protected)
- `POST /api/delivery-data/bulk` - Bulk upload from CSV (protected)
- `POST /api/upload/csv` - Upload and process CSV file (protected)

### Comparison
- `POST /api/compare` - Compare retailers (protected)
  - Body: `{ retailers: string[], country: string }`
- `GET /api/compare/history` - Get user's comparison history (protected)
- `GET /api/compare/:id` - Get specific comparison result (protected)

## Authentication

Protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## CSV Upload Format

The CSV file should have the following columns:
- `retailer` (or `Retailer`) - Retailer name
- `country` (or `Country`) - Country name
- `method` (or `Method`) - Delivery method
- `cost` (or `Cost`) - Shipping cost
- `duration` (or `Duration`) - Delivery duration
- `freeShippingThreshold` (or `Free Shipping Threshold`) - Optional
- `carrier` (or `Carrier`) - Optional
- `additionalNotes` (or `Additional Notes`) - Optional

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Prisma client setup
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── retailerController.ts
│   │   ├── countryController.ts
│   │   ├── deliveryDataController.ts
│   │   └── comparisonController.ts
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication
│   │   ├── validation.ts        # Express validator middleware
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── retailerRoutes.ts
│   │   ├── countryRoutes.ts
│   │   ├── deliveryDataRoutes.ts
│   │   ├── comparisonRoutes.ts
│   │   └── uploadRoutes.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── csvService.ts        # CSV parsing and processing
│   │   └── comparisonService.ts # Comparison logic
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   └── server.ts                # Express app setup
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                  # Seed data
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Database Schema

- **User** - User accounts with authentication
- **Retailer** - Retailer information
- **Country** - Country information with ISO codes
- **DeliveryData** - Delivery options for retailer-country combinations
- **Comparison** - Saved comparison results

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with initial data

## License

ISC

