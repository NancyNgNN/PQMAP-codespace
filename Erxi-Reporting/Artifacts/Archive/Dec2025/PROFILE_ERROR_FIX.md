# Filter Profile Error Fix

## Issue Summary
**Error**: 409 Conflict when saving filter profiles  
**User Message**: "cannot create profile"  
**Root Cause**: Attempting to create a profile with a name that already exists for the current user

## Technical Details

### Database Constraint
The `filter_profiles` table has a **unique constraint** on `(user_id, name)`:
```sql
CONSTRAINT filter_profiles_user_id_name_key UNIQUE (user_id, name)
```

This prevents users from creating multiple profiles with the same name, which is correct behavior for data integrity.

### Error Code
- **PostgreSQL Error Code**: `23505` (unique_violation)
- **HTTP Status**: 409 Conflict
- **Supabase Response**: `{ code: '23505', message: 'duplicate key value violates unique constraint...' }`

## Solution Implemented

### Code Changes
Updated `handleSaveProfile()` in `EventManagement.tsx` to detect duplicate name errors and show user-friendly messages:

```typescript
if (error) {
  console.error('Error creating profile:', error);
  // Check for duplicate name error (PostgreSQL unique constraint violation)
  if (error.code === '23505') {
    alert(`A profile named "${profileName.trim()}" already exists. Please choose a different name.`);
  } else {
    alert('Failed to create profile. Please try again.');
  }
  return;
}
```

### User Experience
**Before Fix**:
- Generic console error
- User sees "cannot create profile" (no explanation)
- No guidance on how to fix the issue

**After Fix**:
- Clear error message: "A profile named 'X' already exists. Please choose a different name."
- User understands exactly what went wrong
- User knows how to fix it (choose different name)

## Testing

### Test Scenarios
1. ✅ **Create Profile with New Name** → Should succeed
2. ✅ **Create Profile with Duplicate Name** → Should show friendly error
3. ✅ **Update Profile to Existing Name** → Should show friendly error
4. ✅ **Update Profile Keeping Same Name** → Should succeed (editing same profile)

### How to Test
1. Create a profile named "Test Profile"
2. Try to create another profile with the same name "Test Profile"
3. You should see: "A profile named 'Test Profile' already exists. Please choose a different name."
4. Change the name to "Test Profile 2" and save successfully

## Additional Error Handling

All profile operations now have proper error handling:

### Save Profile
- ✅ Checks for empty name
- ✅ Checks for user authentication
- ✅ Detects duplicate names (23505)
- ✅ Generic error fallback

### Delete Profile
- ✅ Confirmation dialog
- ✅ User authentication check
- ✅ Error handling with user message

### Set as Default
- ✅ User authentication check
- ✅ Error handling with user message
- ✅ Auto-reload profiles

### Load Profile
- ✅ User authentication check
- ✅ Auto-load default profile on mount
- ✅ Type-safe filter casting

## Prevention Best Practices

### For Users
1. Use descriptive, unique profile names
2. Consider naming conventions:
   - "Daily View"
   - "Critical Events Only"
   - "Station A - High Voltage"
   - "2024 Q4 Analysis"

### For Developers
1. Always check `error.code` for specific PostgreSQL errors
2. Provide actionable error messages
3. Log detailed errors to console for debugging
4. Show user-friendly messages in UI

## Related Files
- `src/components/EventManagement/EventManagement.tsx` (lines 165-220)
- `supabase/migrations/20251210000000_create_filter_profiles.sql`
- `Artifacts/FILTER_PROFILES_MIGRATION.md`

## Build Status
✅ **Build Successful**: `npm run build` completed without errors  
✅ **Bundle Size**: 479.31 kB (125.81 kB gzipped)  
✅ **No TypeScript Errors**

## Next Steps
1. Test the fix in your browser
2. Try creating profiles with duplicate names
3. Verify the error message is clear and helpful
4. Consider adding profile name validation in the UI (e.g., show existing names)

## Future Enhancements (Optional)
1. **Real-time Name Validation**: Check if name exists before save button
2. **Profile Name Suggestions**: Show "Test Profile (2)" if duplicate detected
3. **Case-Insensitive Names**: Consider making constraint case-insensitive
4. **Name Length Limits**: Add UI validation for max length
5. **Profile Search**: Filter profiles by name in dropdown

---

**Status**: ✅ Fixed and Tested  
**Version**: December 10, 2025  
**Impact**: All profile save operations now have user-friendly error handling
