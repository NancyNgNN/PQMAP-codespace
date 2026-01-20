# PQMAP Development Setup Script

This script helps set up your local development environment for PQMAP.

## Prerequisites Check

### 1. Node.js Installation
Check if Node.js 18+ is installed:
```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/

### 2. Supabase Account Setup
1. Create an account at https://supabase.com
2. Create a new project
3. Note down your Project URL and API Key

## Step-by-Step Setup

### Step 1: Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Database Setup

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20251103020125_create_pqmap_schema.sql`
4. Run the query
5. Copy and paste the contents of `supabase/migrations/20251103021739_fix_security_and_performance_issues.sql`
6. Run the query

#### Option B: Using Supabase CLI (Advanced)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Push migrations
supabase db push
```

### Step 4: Seed Database with Mock Data

1. Start the development server:
```bash
npm run dev
```

2. Open the application at http://localhost:5173

3. On the login page, click "Create Demo User Account"

4. Sign in with:
   - Email: admin@clp.com
   - Password: admin123

5. The application will prompt you to seed the database with mock data

### Step 5: Verify Installation

Check that the following components are working:

1. **Authentication**: Can log in with demo user
2. **Dashboard**: Shows statistics and charts
3. **Event Management**: Can view event list
4. **Data Analytics**: Shows analytics data
5. **Asset Management**: Shows PQ meters
6. **Reports**: Report generation interface works
7. **Notifications**: Notification rules display
8. **PQ Services**: Service records display
9. **System Health**: Health monitoring data

## Development Commands

Start development server:
```bash
npm run dev
```

Type checking:
```bash
npm run typecheck
```

Linting:
```bash
npm run lint
npm run lint:fix
```

Code formatting:
```bash
npm run format
npm run format:check
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Ensure `.env` file exists and contains correct Supabase URL and key
   - Restart development server after updating `.env`

2. **"Invalid login credentials"**
   - Click "Create Demo User Account" first
   - Verify Supabase Auth is enabled in your project

3. **Empty dashboard / No data**
   - Run database migrations first
   - Seed database with mock data using the seeding function

4. **TypeScript errors**
   - Run `npm run typecheck` to identify issues
   - Ensure all dependencies are installed

5. **Build errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check for any missing peer dependencies

### Development Tools

1. **Supabase Dashboard**: Monitor database, authentication, and API usage
2. **Browser DevTools**: Debug React components and network requests
3. **VS Code Extensions**: 
   - ES7+ React/Redux/React-Native snippets
   - TypeScript Importer
   - Tailwind CSS IntelliSense
   - Prettier - Code formatter

### Database Administration

View data in Supabase:
1. Go to Supabase Dashboard → Table Editor
2. Browse through the populated tables:
   - substations (10 records)
   - pq_meters (30+ records)
   - customers (80+ records)
   - pq_events (450+ records)
   - sarfi_metrics (120 records)

Reset database:
1. Go to SQL Editor in Supabase
2. Run: `TRUNCATE TABLE notifications, event_customer_impact, pq_events, pq_service_records, reports, notification_rules, sarfi_metrics, system_health, customers, pq_meters, substations CASCADE;`
3. Re-run seeding function in the application

## Next Steps

After successful setup:

1. **Explore the Application**: Navigate through all sections to understand the features
2. **Read the Documentation**: Review `DEMO_GUIDE.md` for detailed feature explanations
3. **Check Development Status**: See `DEV_STATUS.md` for current progress and next tasks
4. **Start Development**: Pick a task from the development status and start coding!

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase project logs
3. Check browser console for JavaScript errors
4. Verify all environment variables are set correctly

For technical questions about the PQMAP system, contact the development team.

---

Last Updated: November 25, 2024