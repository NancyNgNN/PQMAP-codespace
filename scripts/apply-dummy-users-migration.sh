#!/bin/bash

# Apply dummy users migration to Supabase
# This script seeds the profiles table with mock users for notification group demonstration
# NOTE: Database uses user_role enum: 'admin', 'operator', 'viewer'
#       UAM roles map as: system_admin/system_owner -> admin, manual_implementator -> operator, watcher -> viewer

echo "🔄 Applying dummy users migration to Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Apply the migration
echo "📊 Seeding profiles table with 10 dummy users..."
supabase db push

# Check if successful
if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Dummy users created (by database role):"
    echo "   👑 Admins (3 users):"
    echo "      - John Anderson (System Admin)"
    echo "      - Sarah Chen (System Owner)"
    echo "      - Maria Garcia (System Owner)"
    echo "   ⚙️  Operators (4 users):"
    echo "      - Michael Wong"
    echo "      - Emily Rodriguez"
    echo "      - James Park"
    echo "      - Amanda Zhang"
    echo "   👁️  Viewers (3 users):"
    echo "      - David Kim"
    echo "      - Lisa Thompson"
    echo "      - Robert Lee"
    echo ""
    echo "ℹ️  Note: Database uses 'admin', 'operator', 'viewer' roles"
    echo "   (UAM system_admin/system_owner map to 'admin')"
    echo ""
    echo "🎯 You can now use these users in notification groups!"
    echo "   Go to: Notifications → Groups → Add members"
else
    echo "❌ Migration failed. Please check your Supabase connection."
    exit 1
fi
