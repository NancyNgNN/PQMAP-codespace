# Power BI Integration - Questions & Answers

## Q1: Can I test Power BI embedding with my existing Pro account?

**Yes!** You can absolutely test with your Power BI Pro account.

### Testing Steps:

1. **Create a Test Report in Power BI Desktop**
   - Connect to sample data or export CSV from PQMAP
   - Create basic visualizations
   - Save as .pbix file

2. **Publish to Power BI Service**
   - Click "Publish" in Power BI Desktop
   - Sign in with your Pro account
   - Select a workspace

3. **Get Embed Information**
   - Open report in Power BI Service (app.powerbi.com)
   - Click File > Embed > Website or Portal
   - Copy the embed URL

4. **Test in PQMAP** (two options):

   **Option A: Quick Test with iframe**
   ```typescript
   // Add to Dashboard.tsx temporarily
   case 'report-builder':
     return (
       <iframe
         src="YOUR_EMBED_URL"
         width="100%"
         height="600px"
         frameBorder="0"
       />
     );
   ```

   **Option B: Full Integration with powerbi-client-react**
   ```bash
   npm install @microsoft/powerbi-client-react powerbi-client
   ```

   ```typescript
   import { PowerBIEmbed } from 'powerbi-client-react';
   
   <PowerBIEmbed
     embedConfig={{
       type: 'report',
       embedUrl: "YOUR_EMBED_URL",
       accessToken: "YOUR_ACCESS_TOKEN",
       tokenType: models.TokenType.Aad,
     }}
   />
   ```

### Your Embed URL
You mentioned: `https://app.powerbi.com/links/BlRHC1HjOK?ctid=...`

This is a sharing link. For embedding, you need:
- **Embed URL**: From File > Embed report > Secure embed code
- **Access Token**: From Azure AD authentication

### Limitations with Pro License:
- ✅ Can embed for internal users (100 users covered)
- ✅ Users must have Pro licenses (you have this)
- ❌ Cannot embed for external/anonymous users (need Premium/Embedded)
- ✅ All features work (Row-level security, refresh, interactions)

---

## Q2: Should I use Pull (Power BI connects to Supabase) or Push (Supabase pushes to Power BI)?

**Recommendation: PUSH approach** (Supabase → Power BI)

### Comparison Table:

| Feature | Pull (Power BI → Supabase) | Push (Supabase → Power BI) |
|---------|---------------------------|---------------------------|
| **Performance** | ❌ Slower (real-time queries) | ✅ Fast (pre-aggregated data) |
| **Control** | ❌ Limited (Power BI schedule) | ✅ Full control (15-min custom) |
| **Complexity** | ⚠️ Medium (need gateway) | ⚠️ Medium (need API integration) |
| **Latency** | ❌ Higher | ✅ Lower |
| **Cost** | ✅ Uses existing Pro | ✅ Uses existing Pro |
| **Data Volume** | ⚠️ Limited by query time | ✅ Can push aggregated data |
| **Maintenance** | ⚠️ Gateway updates needed | ✅ Simple API calls |

### Push Approach Benefits for Your Use Case:

1. **20,000+ Events**: Pre-aggregate to reduce data volume
   ```typescript
   // Push daily summaries instead of raw events
   const dailySummary = await supabase
     .from('pq_events')
     .select('event_date, severity, count(*), avg(duration_ms)')
     .groupBy('event_date, severity');
   ```

2. **15-Minute Refresh**: Exact control
   ```typescript
   // Cron job every 15 minutes
   setInterval(async () => {
     await pushDataToPowerBI();
   }, 15 * 60 * 1000);
   ```

3. **No Gateway Needed**: Direct API calls
   - No on-premises data gateway
   - No VPN/firewall configuration
   - Cloud-to-cloud communication

4. **Better Performance**: 
   - Power BI queries pre-processed data
   - No load on Supabase during report viewing
   - Faster dashboard load times

### Implementation Architecture (Push):

```
┌─────────────┐      15-min      ┌─────────────┐      Embed     ┌─────────┐
│  Supabase   │────schedule──────>│  Power BI   │───────────────>│ PQMAP   │
│  Database   │    REST API       │  Service    │    Report      │  UI     │
└─────────────┘                   └─────────────┘                └─────────┘
      │                                  │
      │ Real-time                        │ Pre-aggregated
      │ (Report Builder)                 │ (Power BI Reports)
      │                                  │
      v                                  v
   Internal                           Internal
   Analysis                           Dashboards
```

### Pull Approach (Alternative):

Only if you need:
- Real-time data in Power BI (no delay)
- No control over data transformation
- Simple setup without coding

**Requirements:**
- On-premises data gateway OR Power BI Premium
- PostgreSQL connector in Power BI
- Direct connection string to Supabase

---

## Q3: How do I implement SSO with Azure AD?

### Step-by-Step SSO Implementation:

### 1. Register App in Azure Portal

```bash
# Navigate to:
Azure Portal > Azure Active Directory > App registrations > New registration

Name: PQMAP-PowerBI
Supported account types: Single tenant
Redirect URI: https://your-app.com/auth/callback
```

### 2. Configure API Permissions

```bash
Azure Portal > Your App > API permissions > Add permission

Microsoft APIs > Power BI Service:
✓ Report.Read.All
✓ Dataset.ReadWrite.All
✓ Workspace.ReadWrite.All

Grant admin consent for your organization
```

### 3. Install MSAL Library

```bash
npm install @azure/msal-browser @azure/msal-react
```

### 4. Configure MSAL

Create `src/lib/authConfig.ts`:

```typescript
import { Configuration, PopupRequest } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: 'YOUR_CLIENT_ID', // From Azure App Registration
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: ['https://analysis.windows.net/powerbi/api/.default'],
};
```

### 5. Create Auth Provider

Create `src/contexts/PowerBIAuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../lib/authConfig';

const msalInstance = new PublicClientApplication(msalConfig);

interface PowerBIAuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

const PowerBIAuthContext = createContext<PowerBIAuthContextType>(null!);

export function PowerBIAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      try {
        const response = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        setAccessToken(response.accessToken);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Silent token acquisition failed:', error);
      }
    }
  };

  const login = async () => {
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      setAccessToken(response.accessToken);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = () => {
    msalInstance.logoutPopup();
    setAccessToken(null);
    setIsAuthenticated(false);
  };

  return (
    <PowerBIAuthContext.Provider value={{ isAuthenticated, accessToken, login, logout }}>
      {children}
    </PowerBIAuthContext.Provider>
  );
}

export const usePowerBIAuth = () => useContext(PowerBIAuthContext);
```

### 6. Use in Power BI Component

```typescript
import { usePowerBIAuth } from '../../contexts/PowerBIAuthContext';
import { PowerBIEmbed } from 'powerbi-client-react';

export default function PowerBIReport() {
  const { isAuthenticated, accessToken, login } = usePowerBIAuth();

  if (!isAuthenticated) {
    return (
      <button onClick={login}>Sign in to view Power BI Report</button>
    );
  }

  return (
    <PowerBIEmbed
      embedConfig={{
        type: 'report',
        embedUrl: 'YOUR_REPORT_EMBED_URL',
        accessToken: accessToken,
        tokenType: models.TokenType.Aad,
        settings: {
          panes: { filters: { expanded: false, visible: true } },
          background: models.BackgroundType.Transparent,
        },
      }}
      cssClassName="power-bi-frame"
      style={{ height: '600px', border: 'none' }}
    />
  );
}
```

### 7. Wrap App with Provider

```typescript
// src/main.tsx
import { PowerBIAuthProvider } from './contexts/PowerBIAuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <PowerBIAuthProvider>
        <App />
      </PowerBIAuthProvider>
    </AuthProvider>
  </React.StrictMode>
);
```

### Benefits of SSO:

✅ **Single Sign-On**: Users authenticate once
✅ **Seamless Experience**: No repeated logins
✅ **Enterprise Security**: Uses Azure AD
✅ **Automatic Token Refresh**: MSAL handles renewals
✅ **Role-Based Access**: Leverage Azure AD groups

### Testing SSO:

1. **Development**:
   ```typescript
   // Use test account
   clientId: 'your-dev-app-id'
   ```

2. **Production**:
   ```typescript
   // Use production app
   clientId: 'your-prod-app-id'
   ```

3. **Verify**:
   - User clicks "View Power BI Report"
   - Azure login popup appears
   - User signs in with company account
   - Report loads automatically
   - Token refreshes silently

---

## Implementation Priority

### Phase 1: Core Report Builder (Week 1-2)
1. ✅ Install dependencies
2. ✅ Apply database migration
3. ✅ Test Report Builder features
4. ✅ Train users on Report Builder

**Deliverable**: Working Report Builder for 80% of use cases

### Phase 2: Power BI Integration (Week 3-4)
1. Test embedding with your Pro account
2. Set up Azure AD app registration
3. Implement SSO authentication
4. Create push data service
5. Schedule 15-minute sync
6. Test with real reports

**Deliverable**: Power BI embedded for 20% of advanced use cases

### Phase 3: Optimization (Week 5+)
1. Monitor performance
2. Add row-level security
3. Optimize data sync
4. Create user documentation
5. Train power users

---

## Cost Analysis

### Current Setup (100 Power BI Pro Users)
- Monthly Cost: 100 users × $10 = **$1,000/month**
- What you get:
  - Full Power BI features
  - Report creation & sharing
  - Embedding capability
  - 15-minute refresh
  - Row-level security

### Alternative: Power BI Embedded (If needed for external users)
- Pay-per-use: ~$1/hour for A1 SKU
- Fixed: $736/month for A1 (always-on)
- Only needed if sharing with non-employees

### Recommendation:
✅ **Stick with Pro licenses** for your use case
- All internal users
- Already have licenses
- No additional cost
- All features available

---

## Quick Start Checklist

- [ ] Install Report Builder dependencies
- [ ] Apply database migration
- [ ] Add Report Builder to dashboard
- [ ] Test basic report creation
- [ ] Create sample Power BI report
- [ ] Get embed URL from Power BI Service
- [ ] Test iframe embedding
- [ ] Set up Azure AD app (if going beyond iframe)
- [ ] Implement MSAL authentication
- [ ] Test full embedding
- [ ] Create data push service
- [ ] Schedule 15-minute sync
- [ ] Train users
- [ ] Monitor and optimize

---

## Support Resources

### Power BI
- [Embed Reports Documentation](https://learn.microsoft.com/en-us/power-bi/developer/embedded/)
- [Power BI REST API](https://learn.microsoft.com/en-us/rest/api/power-bi/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)

### React Integration
- [powerbi-client-react](https://github.com/microsoft/powerbi-client-react)
- [Azure MSAL React](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react)

### Supabase
- [PostgreSQL Functions](https://supabase.com/docs/guides/database/functions)
- [Edge Functions](https://supabase.com/docs/guides/functions) (for scheduled push)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
