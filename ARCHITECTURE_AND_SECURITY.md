# Architecture and Security Documentation

## 🔐 Security Architecture Overview

This document explains the security model and architecture of the Fitness App, ensuring all features work properly while maintaining data security.

## 🏗️ Database Architecture

### Table Relationships

```
auth.users (Supabase Auth)
    ↓
public.users (extends auth.users)
    ↓
public.trainers (optional, linked via user_id)
    ↓
public.training_sessions (created by trainers)
    ↓
public.bookings (created by clients for sessions)
```

### Key Design Principles

1. **Single Source of Truth**: `auth.users` is the source of authentication
2. **Profile Extension**: `public.users` extends auth with app-specific data
3. **Role-Based Access**: Trainers are identified via `public.trainers` table
4. **Foreign Key Integrity**: All relationships use proper foreign keys with CASCADE

## 🔒 Row Level Security (RLS) Model

### Security Philosophy

- **Principle of Least Privilege**: Users can only access their own data
- **Role-Based Access**: Different permissions for trainers vs. clients
- **Trigger-Based Creation**: User profiles created automatically via trigger
- **SECURITY DEFINER Functions**: Triggers bypass RLS when necessary

### RLS Policy Breakdown

#### 1. `public.users` Table

**Policies:**
- ✅ **SELECT**: Users can view their own profile (`auth.uid() = id`)
- ✅ **UPDATE**: Users can update their own profile (`auth.uid() = id`)
- ✅ **INSERT**: Users can insert their own profile (`auth.uid() = id`)

**Why**: Users need to manage their own profile data. The trigger creates the initial record, but users can update it.

#### 2. `public.trainers` Table

**Policies:**
- ✅ **SELECT**: Anyone can view trainers (for browsing trainer profiles)
- ✅ **INSERT**: Users can create their own trainer profile (`auth.uid() = user_id`)
- ✅ **UPDATE**: Trainers can update their own profile (`auth.uid() = user_id`)

**Why**: 
- Public viewing allows clients to browse trainers
- Users can register as trainers (must match their user_id)
- Trainers can update their own information

#### 3. `public.training_sessions` Table

**Policies:**
- ✅ **SELECT**: Anyone can view available sessions (for browsing)
- ✅ **ALL** (INSERT/UPDATE/DELETE): Trainers can manage their own sessions

**Why**:
- Clients need to see available sessions to book them
- Only trainers should create/modify their sessions

#### 4. `public.bookings` Table

**Policies:**
- ✅ **SELECT**: 
  - Users can view their own bookings (`auth.uid() = client_id`)
  - Trainers can view bookings for their sessions (via JOIN)
- ✅ **INSERT**: Users can create bookings for themselves (`auth.uid() = client_id`)
- ✅ **UPDATE**: 
  - Users can update their own bookings (cancel)
  - Trainers can update bookings for their sessions (confirm)

**Why**:
- Clients need to book and manage their bookings
- Trainers need to see and confirm bookings for their sessions

## 🔄 User Registration Flow

### Regular User Registration

1. User signs up via `supabase.auth.signUp()`
2. **Trigger fires**: `on_auth_user_created` automatically creates `public.users` record
3. User receives email confirmation (if enabled)
4. User can now use the app

### Trainer Registration

1. User signs up via `supabase.auth.signUp()`
2. **Trigger fires**: `on_auth_user_created` automatically creates `public.users` record
3. **Wait for trigger**: Code waits up to 10 seconds for trigger to complete
4. **Verify user exists**: Check if `public.users` record exists
5. **Create trainer profile**: Insert into `public.trainers` with `user_id` reference
6. User receives email confirmation
7. User can now access trainer features

### Why the Wait?

The trigger runs asynchronously. We wait to ensure:
- The `public.users` record exists before creating `trainers` record
- Foreign key constraint is satisfied
- No RLS violations occur

## 🛡️ Security Features

### 1. Trigger Security

The `handle_new_user()` function runs as `SECURITY DEFINER`:
- Bypasses RLS policies
- Can insert into `public.users` regardless of RLS
- Ensures user profile is always created

### 2. RLS Policy Security

All policies use `auth.uid()` to verify:
- Users can only access their own data
- Trainers can only manage their own sessions
- Clients can only book for themselves

### 3. Foreign Key Constraints

- `trainers.user_id` → `users.id` (CASCADE on delete)
- `training_sessions.trainer_id` → `trainers.id` (CASCADE on delete)
- `bookings.client_id` → `users.id` (CASCADE on delete)
- `bookings.session_id` → `training_sessions.id` (CASCADE on delete)

**Why CASCADE**: If a user is deleted, their related data is automatically cleaned up.

## 🚀 Feature Access Matrix

| Feature | Regular User | Trainer |
|---------|-------------|---------|
| View own profile | ✅ | ✅ |
| Update own profile | ✅ | ✅ |
| View trainers | ✅ | ✅ |
| View available sessions | ✅ | ✅ |
| Book sessions | ✅ | ❌ |
| View own bookings | ✅ | ✅ (their sessions' bookings) |
| Cancel own bookings | ✅ | ❌ |
| Create trainer profile | ✅ (once) | N/A |
| Create training sessions | ❌ | ✅ |
| Manage own sessions | ❌ | ✅ |
| Confirm bookings | ❌ | ✅ (for their sessions) |
| Create bookings for clients | ❌ | ✅ |

## 🔧 Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause**: RLS policy is blocking the operation.

**Solutions**:
1. Run `fix_complete_rls_policies.sql` to ensure all policies are correct
2. Verify the trigger is set up (run verification queries in the SQL file)
3. Check that `auth.uid()` matches the user ID being accessed

### Issue: Foreign key constraint violation

**Cause**: Referenced record doesn't exist.

**Solutions**:
1. Ensure trigger creates `public.users` record
2. Wait longer for trigger to complete
3. Check trigger is enabled and working

### Issue: Trainer can't create sessions

**Cause**: RLS policy or missing trainer record.

**Solutions**:
1. Verify trainer profile exists in `public.trainers`
2. Check `trainer_id` is correctly linked to `trainers.id`
3. Verify RLS policy allows trainer to INSERT into `training_sessions`

## 📋 Setup Checklist

- [ ] Run `fix_complete_rls_policies.sql` in Supabase SQL Editor
- [ ] Verify trigger exists: Check `information_schema.triggers`
- [ ] Verify function security: Check `handle_new_user()` is `SECURITY DEFINER`
- [ ] Test user registration
- [ ] Test trainer registration
- [ ] Test booking creation
- [ ] Test trainer session creation
- [ ] Test booking confirmation

## 🎯 Best Practices

1. **Always use `auth.uid()`** in RLS policies to verify user identity
2. **Use SECURITY DEFINER** for triggers that need to bypass RLS
3. **Wait for triggers** when creating dependent records
4. **Test RLS policies** after any changes
5. **Use foreign keys** to maintain data integrity
6. **CASCADE deletes** to prevent orphaned records

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)

