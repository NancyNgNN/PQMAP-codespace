# SARFI Configuration - Deployment Checklist

## Pre-Deployment Checklist

### Database Setup
- [ ] **Review migration file**: `/supabase/migrations/20251209000000_create_sarfi_profiles.sql`
- [ ] **Backup existing database** before applying migration
- [ ] **Apply migration** to development environment first
- [ ] **Verify tables created**:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name IN ('sarfi_profiles', 'sarfi_profile_weights');
  ```
- [ ] **Test RLS policies** with different user roles
- [ ] **Verify cascade delete** works correctly
- [ ] **Check indexes** are created properly

### Data Seeding
- [ ] **Review seed script**: `scripts/seed-sarfi-profiles.js`
- [ ] **Verify meters exist** in pq_meters table
- [ ] **Run seed script** in development:
  ```bash
  node scripts/seed-sarfi-profiles.js
  ```
- [ ] **Verify 3 profiles created** (2023, 2024, 2025)
- [ ] **Check weight factors** exist for all meters
- [ ] **Confirm 2025 is active** profile

### Code Review
- [ ] **Review TypeScript types** in `src/types/database.ts`
- [ ] **Check component imports** are correct
- [ ] **Verify service functions** properly handle errors
- [ ] **Test localStorage** persistence logic
- [ ] **Ensure proper typing** throughout codebase
- [ ] **No console.errors** in production code (except error handling)

### Component Testing

#### SARFIChart
- [ ] Settings button renders in correct position
- [ ] Modal opens on button click
- [ ] Modal closes on backdrop click
- [ ] Filter state persists in localStorage
- [ ] Data table shows/hides based on toggle
- [ ] Chart updates when filters applied
- [ ] Loading states display properly

#### SARFIConfigModal
- [ ] All filter options render
- [ ] Profile dropdown populated from database
- [ ] Voltage level options correct
- [ ] Toggles work smoothly
- [ ] Apply button disabled when no profile selected
- [ ] Cancel button resets changes
- [ ] Closes after applying filters

#### SARFIDataTable
- [ ] Table renders with correct columns
- [ ] Data displays properly
- [ ] Footer totals calculate correctly
- [ ] Responsive on different screen sizes
- [ ] Empty state shows when no data
- [ ] Scrolls horizontally on small screens

#### SARFIProfileManagement
- [ ] Profile list loads on mount
- [ ] Create profile form works
- [ ] Profile selection updates weights panel
- [ ] Weight inline editing functions
- [ ] Delete confirmation works
- [ ] Only accessible to admin/operator roles
- [ ] Loading states during async operations

### Service Layer Testing
- [ ] Test `fetchSARFIProfiles()` returns data
- [ ] Test `createSARFIProfile()` creates successfully
- [ ] Test `updateSARFIProfile()` updates correctly
- [ ] Test `deleteSARFIProfile()` removes profile and weights
- [ ] Test `fetchProfileWeights()` joins with meters
- [ ] Test `upsertProfileWeight()` creates and updates
- [ ] Test `fetchFilteredSARFIData()` applies filters
- [ ] Test error handling for all functions

### Security Testing
- [ ] **Viewer role** can view profiles (read-only)
- [ ] **Operator role** can create/edit profiles
- [ ] **Admin role** has full access
- [ ] **Unauthenticated users** blocked by RLS
- [ ] **SQL injection** prevented by parameterized queries
- [ ] **XSS protection** in place for user inputs

### Performance Testing
- [ ] Dashboard loads in < 2 seconds
- [ ] Filter application completes in < 1 second
- [ ] Profile management page responsive
- [ ] Weight editing updates immediately
- [ ] Large datasets (1000+ meters) handled gracefully
- [ ] No memory leaks in localStorage

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Large screens (2560x1440)

## Deployment Steps

### Step 1: Database Migration
```bash
# Via Supabase dashboard
1. Navigate to SQL Editor
2. Copy migration file contents
3. Execute SQL
4. Verify success in Table Editor

# OR via Supabase CLI
supabase db push
```

### Step 2: Seed Initial Data
```bash
# Development
node scripts/seed-sarfi-profiles.js

# Production (if needed)
NODE_ENV=production node scripts/seed-sarfi-profiles.js
```

### Step 3: Deploy Frontend
```bash
# Build production bundle
npm run build

# Test build locally
npm run preview

# Deploy to hosting (e.g., Vercel, Netlify)
# Follow your deployment process
```

### Step 4: Post-Deployment Verification
- [ ] Visit production URL
- [ ] Login with admin account
- [ ] Navigate to SARFI dashboard
- [ ] Click settings button
- [ ] Verify profiles loaded
- [ ] Test filter application
- [ ] Check data table display
- [ ] Navigate to profile management
- [ ] Test creating a profile
- [ ] Test editing weights
- [ ] Verify changes persist
- [ ] Logout and login as different role
- [ ] Verify role-based permissions

## Post-Deployment Monitoring

### Day 1
- [ ] Monitor error logs for exceptions
- [ ] Check database query performance
- [ ] Review user feedback
- [ ] Monitor page load times
- [ ] Check localStorage usage

### Week 1
- [ ] Analyze usage patterns
- [ ] Identify most-used filters
- [ ] Review profile creation frequency
- [ ] Check for any data inconsistencies
- [ ] Gather user feedback

### Month 1
- [ ] Evaluate weight factor adjustments
- [ ] Analyze SARFI calculation accuracy
- [ ] Review profile management usage
- [ ] Plan for enhancements
- [ ] Document lessons learned

## Rollback Plan

If issues arise after deployment:

### Immediate Rollback (< 1 hour)
1. **Revert frontend deployment** to previous version
2. **Keep database changes** (data not lost)
3. **Investigate issues** offline
4. **Fix and re-deploy** when ready

### Database Rollback (if necessary)
1. **Backup current state** first
2. **Drop new tables**:
   ```sql
   DROP TABLE sarfi_profile_weights CASCADE;
   DROP TABLE sarfi_profiles CASCADE;
   ```
3. **Restore previous state**
4. **Note**: This loses all profile data

### Partial Rollback
- **Hide UI components** via feature flag
- **Keep database schema** intact
- **Fix issues** without losing data
- **Re-enable gradually**

## Training & Documentation

### User Training
- [ ] Create video tutorial (5-10 minutes)
- [ ] Write user guide document
- [ ] Prepare FAQ document
- [ ] Schedule training sessions
- [ ] Create quick reference card

### Admin Training
- [ ] Document profile management workflow
- [ ] Explain weight factor methodology
- [ ] Train on data validation
- [ ] Provide troubleshooting guide
- [ ] Schedule admin-specific training

## Success Criteria

### Functional Requirements ✅
- ✅ Configuration modal accessible from SARFI chart
- ✅ 5 filter options implemented and functional
- ✅ Data table displays meter-level details
- ✅ Profile management for admin users
- ✅ Weight factor editing capability
- ✅ Filter persistence across sessions

### Performance Requirements
- [ ] Dashboard loads in < 2 seconds
- [ ] Filter application in < 1 second
- [ ] Smooth UI interactions (no lag)
- [ ] Handles 1000+ meters efficiently

### User Satisfaction
- [ ] 90% user satisfaction score
- [ ] < 5% error rate in usage
- [ ] Positive feedback from admins
- [ ] Increased SARFI dashboard usage

### Technical Quality
- [ ] Zero critical bugs in first week
- [ ] < 3 minor bugs in first month
- [ ] No security vulnerabilities
- [ ] Code passes all reviews

## Communication Plan

### Pre-Deployment
- [ ] Announce upcoming feature to users
- [ ] Provide preview/demo
- [ ] Send training schedule
- [ ] Share documentation links

### Deployment Day
- [ ] Send deployment notification
- [ ] Provide support contact info
- [ ] Monitor for immediate issues
- [ ] Be available for questions

### Post-Deployment
- [ ] Send success announcement
- [ ] Share usage statistics
- [ ] Solicit feedback
- [ ] Document lessons learned

## Contact Information

**Development Team**: [Your Team Email]  
**Support**: [Support Email/Channel]  
**Documentation**: `/Artifacts/SARFI_*.md`  
**Emergency Contact**: [On-call Engineer]

## Sign-Off

- [ ] **Developer**: Code complete and tested
- [ ] **QA**: All test cases passed
- [ ] **Product Owner**: Accepts implementation
- [ ] **DBA**: Database changes approved
- [ ] **DevOps**: Deployment plan approved
- [ ] **Security**: Security review passed
- [ ] **Stakeholders**: Business requirements met

---

**Deployment Date**: __________________  
**Deployed By**: __________________  
**Production URL**: __________________  
**Status**: ⬜ Ready | ⬜ In Progress | ⬜ Complete

---

## Notes

[Add any deployment-specific notes here]
