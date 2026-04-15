# Timelify - Booking Management System

A comprehensive **booking and appointment management platform** that connects service specialists with customers. Built with modern technologies to provide seamless scheduling, payments, notifications, and user management.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Routes](#api-routes)
- [Database](#database)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

Timelify is a full-featured booking management system designed for service-based businesses. It allows users to browse services, book appointments with specialists, make payments securely, and receive notifications about their bookings.

**Key Use Cases:**
- Online appointment scheduling
- Service catalog management
- Specialist profile management
- Payment processing
- Real-time notifications
- Review and rating system

---

## ✨ Features

- **Authentication & Authorization**
  - User registration and login
  - JWT-based authentication
  - Role-based access control (Admin, User, Specialist)
  - Password reset and change functionality

- **Booking Management**
  - Create, update, and cancel bookings
  - Real-time availability checking
  - Booking status tracking

- **Service Management**
  - Browse services by category and sub-category
  - Business profile management
  - Portfolio and work samples

- **Payment Processing**
  - Secure payment integration with PayFast
  - Payment status tracking
  - Transaction history

- **Specialist Management**
  - Specialist profiles and directories
  - Availability scheduling
  - Performance ratings

- **User Features**
  - Bookmarks and favorites
  - Search history
  - User subscriptions
  - Review and rating system
  - Personalized notifications

- **Admin Features**
  - User management
  - Business verification
  - Subscription management
  - Analytics and reporting

- **Notifications**
  - Email notifications (via Brevo SMTP)
  - Firebase push notifications
  - Daily scheduler for notifications

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js |
| **Language** | TypeScript |
| **Framework** | Express.js |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | JWT |
| **Email Service** | Brevo (Sendinblue) |
| **Push Notifications** | Firebase Cloud Messaging |
| **File Upload** | Multer |
| **Validation** | Zod |
| **Deployment** | Vercel / Docker |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── db/                    # Database configuration
│   ├── middlewares/           # Express middlewares
│   │   ├── auth.ts
│   │   ├── globalErrorHandler.ts
│   │   └── validateRequest.ts
│   └── modules/               # Feature modules
│       ├── Auth/              # Authentication
│       ├── booking/           # Booking management
│       ├── business/          # Business profiles
│       ├── category/          # Service categories
│       ├── favorite/          # Favorite bookmarks
│       ├── notification/      # Notifications
│       ├── payment/           # Payment processing
│       ├── portfolio/         # Work samples
│       ├── review/            # Reviews & ratings
│       ├── searchHistory/     # Search history tracking
│       ├── service/           # Service listings
│       ├── specialist/        # Specialist profiles
│       └── User/              # User management
├── config/                    # Configuration files
├── errors/                    # Error handling
├── helpers/                   # Utility functions
├── interfaces/                # TypeScript interfaces
├── shared/                    # Shared utilities
│   ├── emailSender.ts
│   ├── firebase.ts
│   ├── payment.ts
│   └── ...
├── app.ts                     # Express app setup
└── server.ts                  # Server entry point

prisma/
└── schema.prisma              # Database schema

public/
└── payment/                   # Payment callback pages
    ├── success.html
    └── cancel.html
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database
- **Environment variables** configured

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/md-hasan1/booking-management.git
   cd booking-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Setup the database**
   ```bash
   npx prisma migrate dev
   ```

5. **Generate Prisma Client**
   ```bash
   npm run build
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000` (or your configured port)

---

## 🔧 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/booking_db

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE_IN=7d

# Email Service (Brevo/Sendinblue)
BREVO_SMTP_USER=your_brevo_email@example.com
BREVO_SMTP_PASSWORD=your_brevo_smtp_password

# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# Payment Gateway (PayFast)
PAYFAST_MERCHANT_ID=your_payfast_merchant_id
PAYFAST_MERCHANT_KEY=your_payfast_merchant_key
PAYFAST_API_KEY=your_payfast_api_key

# File Upload
MAX_FILE_SIZE=5242880

# Timezone
APP_TIMEZONE=UTC
```

---

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload

# Production
npm run build            # Compile TypeScript to JavaScript
npm start                # Run production build

# Database
npx prisma migrate dev   # Create and apply migrations
npx prisma studio       # Open Prisma Studio (database GUI)

# Code Generation
npm run generate         # Generate module boilerplate
```

---

## 🔌 API Routes Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/get-me` - Get current user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users
- `POST /api/users` - Create user
- `POST /api/users/create-admin` - Create admin (admin only)
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get service details
- `POST /api/services` - Create service (admin)
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Specialists
- `GET /api/specialists` - Get all specialists
- `GET /api/specialists/:id` - Get specialist profile
- `PUT /api/specialists/:id` - Update specialist profile

### Payments
- `POST /api/payments` - Initiate payment
- `GET /api/payments/:id` - Get payment status
- `POST /api/payments/webhook` - Payment webhook

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/:bookingId` - Get reviews for booking
- `PUT /api/reviews/:id` - Update review

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

---

## 💾 Database

### Setup with Prisma

```bash
# Create database migrations
npx prisma migrate dev --name init

# Reset database (development only)
npx prisma migrate reset

# View database in GUI
npx prisma studio
```

### Database Schema
The database schema is defined in [prisma/schema.prisma](prisma/schema.prisma) and includes:
- Users, Specialists, Businesses
- Services, Categories, Sub-categories
- Bookings, Payments, Reviews
- Notifications, Search History
- Favorites, Subscriptions

---

## 🚢 Deployment

### Docker
```bash
docker-compose up --build
```

### Vercel
```bash
vercel deploy
```

Ensure all environment variables are configured in your deployment platform.

---

## 📝 Notes

- **Timezone Handling**: The app includes timezone utilities to handle scheduling across different regions
- **Email Templates**: Check [src/shared/emaiHTMLtext.ts](src/shared/emaiHTMLtext.ts) for email templates
- **Error Handling**: Global error handler with Zod validation error parsing

---

## 👥 Contributing

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Commit your changes: `git commit -m 'Add feature'`
3. Push to the branch: `git push origin feature/feature-name`
4. Open a Pull Request

---

## 📄 License

ISC

---

## 📧 Support

For support or questions, please contact: mdhasan26096@gmail.com

---

**Happy Coding! 🎉**


