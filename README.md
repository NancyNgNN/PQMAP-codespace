# PQMAP - Power Quality Monitoring and Analysis Platform

## Overview

PQMAP is a comprehensive web-based platform for monitoring, analyzing, and reporting on power quality events across CLP's electrical grid. This React TypeScript application provides a unified interface for engineers and account managers to track voltage dips, harmonics, and other power disturbances.

## Features

- **Real-time Dashboard**: Monitor power quality events, SARFI metrics, and system health
- **Event Management**: Track and analyze power quality events with waveform visualization
- **Data Analytics**: Comprehensive analytics with IEEE 519 compliance tracking
- **Asset Management**: Monitor PQ meters and their communication status
- **Report Generation**: Generate compliance reports for various standards
- **Notification System**: Configurable alerts for critical events
- **Role-based Access**: Admin, Operator, and Viewer roles with appropriate permissions

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd PQMAP_Prototype
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up the database:
   - Run the migrations in `supabase/migrations/` in your Supabase dashboard
   - Or use the Supabase CLI:
     ```bash
     supabase db push
     ```

### Development

Start the development server:
```bash
npm run dev
```
test

The application will be available at `http://localhost:5173`

### Building

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

- **profiles**: User profiles with role-based access
- **substations**: Physical substation locations
- **pq_meters**: Power quality monitoring devices
- **pq_events**: Power quality events (dips, swells, harmonics, etc.)
- **customers**: Customer accounts and service points
- **event_customer_impact**: Links events to affected customers
- **notifications**: Alert and notification records
- **sarfi_metrics**: SARFI index calculations
- **system_health**: System monitoring data

## User Roles

1. **Admin**: Full system access, can manage all data and settings
2. **Operator**: Can view and modify events, meters, and service records
3. **Viewer**: Read-only access to all dashboards and reports

## Demo Account

For demonstration purposes, you can create a demo user:

1. Click "Create Demo User Account" on the login page
2. Sign in with:
   - Email: admin@clp.com
   - Password: admin123

## Standards Compliance

The system tracks compliance with international power quality standards:

- **EN 50160**: Voltage characteristics of electricity supplied by public distribution systems
- **IEEE 519**: Harmonic control in electrical power systems
- **IEC 61000**: Electromagnetic compatibility (EMC)
- **ITIC Curve**: Information Technology Industry Council power acceptability

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Copyright (c) 2024 CLP Power. All rights reserved.
