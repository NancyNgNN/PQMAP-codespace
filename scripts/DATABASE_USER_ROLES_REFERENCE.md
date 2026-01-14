# Database User Roles Reference

## ⚠️ IMPORTANT: Enum Values

The PQMAP database uses a **user_role enum** with only 3 values:

```sql
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');
```

## Role Mapping Guide

### UAM System (External) → PQMAP Database

| UAM Role | PQMAP Database Role | Description |
|----------|---------------------|-------------|
| `system_admin` | **`admin`** | Full system access |
| `system_owner` | **`admin`** | Full system access (same as admin) |
| `manual_implementator` | **`operator`** | Operational access with some restrictions |
| `watcher` | **`viewer`** | Read-only access |

## Common Mistakes to Avoid

❌ **WRONG:**
```sql
INSERT INTO profiles (role) VALUES ('system_admin');  -- ERROR!
INSERT INTO profiles (role) VALUES ('system_owner');  -- ERROR!
```

✅ **CORRECT:**
```sql
INSERT INTO profiles (role) VALUES ('admin');
INSERT INTO profiles (role) VALUES ('operator');
INSERT INTO profiles (role) VALUES ('viewer');
```

## When Writing Migrations

**Always use these values in SQL:**
- `'admin'` - for admins and system owners
- `'operator'` - for manual implementators
- `'viewer'` - for watchers

**TypeScript/Frontend may use different names** in the UAM service layer, but database operations must use the enum values above.

## Checking Valid Enum Values

To verify enum values in your database:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype 
ORDER BY enumsortorder;
```

Expected output:
```
 enumlabel 
-----------
 admin
 operator
 viewer
```

## File Locations

- **Enum Definition:** `supabase/migrations/20251103020125_create_pqmap_schema.sql` (line 171)
- **Profiles Table:** `supabase/migrations/20251103020125_create_pqmap_schema.sql` (line 179)
- **UAM Service (Frontend):** `src/services/userManagementService.ts`

## Future-Proofing

If you need to add new roles to the database:

```sql
-- Add new enum value (can only add, not remove)
ALTER TYPE user_role ADD VALUE 'new_role_name';

-- Or drop and recreate (requires dropping all dependent objects)
DROP TYPE user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer', 'new_role');
-- Then recreate all tables and columns that use this type
```

## Foreign Key Constraint Issue

The `profiles` table has a FK constraint to `auth.users`:

```sql
CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
```

### For Development/Demo Users

If you're inserting dummy users (not real authenticated users), you need to:

**Option 1: Temporarily disable FK constraint** (Used in our seed scripts)
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
-- Insert your dummy data
-- Optionally re-enable: ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey ...
```

**Option 2: Use existing auth.users IDs**
```sql
-- Find existing user IDs first
SELECT id, email FROM auth.users LIMIT 10;
-- Use those IDs in your INSERT statements
```

**Option 3: Create auth.users entries** (Requires service_role access)
```sql
-- Insert into auth schema first
INSERT INTO auth.users (id, email, encrypted_password, ...)
VALUES (...);
-- Then insert into profiles
```

---

**Last Updated:** January 14, 2026  
**Maintained by:** Development Team
