# FutsalHub

**A complete online futsal ground booking platform for Nepal**

---

## Overview

FutsalHub is a web-based platform that digitizes the futsal ground booking process in Nepal. It enables players to view real-time slot availability, book courts, and make secure online payments. Futsal owners can manage their facilities, slots, bookings, and generate reports through dedicated dashboards. The platform eliminates manual booking issues such as double booking, miscommunication, and poor record keeping.

---

## Features

### User Module
- Email registration with verification
- Google OAuth login
- Password recovery via email
- Search and filter futsals by name, location, price, and popularity
- Real-time slot availability by date
- Single and multiple slot booking
- Khalti payment gateway integration
- Booking cancellation with automatic refund (up to 2 hours before slot)
- Booking history and payment tracking
- Review and rating system (1-5 stars with images)
- Profile management

### Admin Module (Futsal Manager)
- Futsal information management
- Configurable slot generation (open/close time, duration, pricing, peak hours)
- Single and bulk slot creation (date range with day selection)
- Slot editing, toggling, and deletion
- Booking management with status filtering
- Payment and revenue statistics
- User restriction and unrestriction
- Review moderation (approve, reject, delete)
- PDF report generation (daily, weekly, monthly)

### Super Admin Module
- Full CRUD operations on all futsals
- Activate/deactivate futsals
- Admin account management (create, view, delete)
- Cross-futsal booking and payment views
- Platform-wide statistics
- Global review management
- Report generation for all or specific futsals

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js |
| Backend | Laravel (PHP) |
| Database | MySQL |
| Authentication | Laravel Sanctum |
| Payment Gateway | Khalti API |
| Maps | Google Maps API |
| Email | SMTP |
| Version Control | Git / GitHub |

---

## Prerequisites

- PHP >= 8.0
- Composer
- Node.js >= 16.x
- MySQL >= 5.7
- XAMPP (optional, for local environment)
