# Fix npm Dependencies Issue

The `npm run dev` error about missing packages (`react-sortablejs`, `fast-equals`, `dompurify`) is a known issue with some transitive dependencies.

## Quick Fix

Run one of these commands:

### Option 1: Clean reinstall (Recommended)

```bash
cd /workspaces/PQMAP-codespace
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Option 2: Just npm audit fix

```bash
cd /workspaces/PQMAP-codespace
npm audit fix --force
npm run dev
```

### Option 3: Manual install missing packages

```bash
cd /workspaces/PQMAP-codespace
npm install react-sortablejs fast-equals dompurify
npm run dev
```

## What's Happening?

The `package.json` declares some dependencies that have sub-dependencies with incorrect `main`/`exports` in their own `package.json` files. Vite's dependency pre-bundler can't resolve them.

**Affected packages:**
- `react-pivottable` → requires `react-sortablejs`
- `@tiptap/react` → requires `fast-equals`
- `jspdf` → requires `dompurify`

## Expected Output After Fix

When it works, you should see:

```
> pqmap-prototype@1.0.0 dev
> vite

  VITE v5.4.8  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

No red error messages = success! ✓

## Troubleshooting

**Still getting errors?**

1. Check Node.js version:
   ```bash
   node --version  # Should be v16 or higher
   ```

2. Check npm version:
   ```bash
   npm --version  # Should be v7 or higher
   ```

3. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

4. Try the clean install again:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**Still stuck?** Check the browser console (F12) for more detailed errors.
