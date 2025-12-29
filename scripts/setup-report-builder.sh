#!/bin/bash
# Report Builder Quick Setup Script
# Run this script to install all dependencies and set up Report Builder

echo "🚀 Installing Report Builder Dependencies..."
echo ""

# Core dependencies
echo "📦 Installing core packages..."
npm install react-pivottable plotly.js react-plotly.js xlsx jspdf jspdf-autotable

# Type definitions
echo "📝 Installing TypeScript definitions..."
npm install --save-dev @types/react-pivottable @types/plotly.js

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Add CSS import to src/index.css:"
echo "   @import 'react-pivottable/pivottable.css';"
echo ""
echo "2. Apply database migration:"
echo "   - Open Supabase SQL Editor"
echo "   - Run: supabase/migrations/20250101000000_create_saved_reports.sql"
echo "   OR"
echo "   - Run: supabase db push (if using CLI)"
echo ""
echo "3. (Optional) Add Report Builder to default layouts:"
echo "   - Edit src/types/dashboard.ts"
echo "   - Add to DEFAULT_LAYOUTS for each role:"
echo "     { id: 'report-builder', col: 0, row: X, width: 12, visible: true }"
echo ""
echo "4. Start development server:"
echo "   npm run dev"
echo ""
echo "5. Test Report Builder:"
echo "   - Navigate to Dashboard"
echo "   - Click 'Edit Layout'"
echo "   - Add 'Report Builder' widget"
echo ""
echo "📚 Documentation:"
echo "   - Artifacts/REPORT_BUILDER_IMPLEMENTATION.md"
echo "   - Artifacts/REPORT_BUILDER_SETUP_GUIDE.md"
echo "   - Artifacts/POWER_BI_INTEGRATION_QA.md"
echo ""
echo "🎉 Setup complete! Happy reporting!"
