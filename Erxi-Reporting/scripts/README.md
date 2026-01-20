# Mother Event Demo Data Generator

This directory contains scripts and utilities to generate demo data for testing the Mother Event Grouping functionality with Child Events navigation.

## 🚀 Quick Setup - UI Method (Easiest)

### Using the Database Controls Interface

1. **Start the PQMAP application**
   ```bash
   cd /workspaces/codespaces-react
   npm run dev
   ```

2. **Open the application in your browser** (usually `http://localhost:5173` or `http://localhost:5174`)

3. **Navigate to Database Controls**
   - Click on "Database Controls" in the navigation menu

4. **Generate Mother Event Demo Data**
   - Find the "Mother Event Demo Data" section
   - Click the purple **"Generate Mother Events"** button
   - Wait for the success message

5. **Test the functionality**
   - Go to Event Management page
   - Look for events with "Mother Event" label
   - Click on mother events to test the Child Events tab

## 🎯 Alternative Setup - Browser Console Method

### Option 1: Generate New Mother Event Scenarios

1. **Start the PQMAP application**
   ```bash
   cd /workspaces/codespaces-react
   npm run dev
   ```

2. **Open the application in your browser** (usually `http://localhost:5173`)

3. **Open Browser Developer Tools** (Press F12)

4. **Go to the Console tab**

5. **Copy and paste the contents of `console-seed-mother-events.js`**

6. **Press Enter to run the script**

The script will create 3 realistic mother event scenarios:
- Grid Switching Cascade Failure
- Transformer Overload Event Group  
- Weather-Related Multi-Station Impact

### Option 2: Convert Existing Events to Mother Events

If you already have events in your database:

1. **Follow steps 1-4 from Option 1**

2. **Copy and paste the contents of `update-existing-events.js`**

3. **Press Enter to run the script**

This will convert existing events into mother-child relationships.

## 📋 Testing the Child Events Tab

After running either script:

1. **Navigate to Event Management** in the PQMAP application

2. **Look for events with "Mother Event" status indicators**

3. **Click on a mother event** to view its details

4. **Find the "Child Events" tab** at the top of the Event Details panel

5. **Click child event cards** to navigate to their details

6. **Use the back button** to return to the mother event

7. **Test the navigation flow** between mother and child events

## 🎯 Expected Demo Scenarios

### Scenario 1: Grid Switching Cascade Failure
- **Mother Event**: Critical interruption from grid switching malfunction  
- **Child Events**: 3 voltage dips occurring 15s, 35s, and 95s later
- **Demonstrates**: Cascading failure propagation across the grid

### Scenario 2: Transformer Overload Event Group  
- **Mother Event**: High severity voltage swell from transformer tap operation
- **Child Events**: Harmonic distortion (8s later) and voltage flicker (2m 25s later)
- **Demonstrates**: Equipment overload causing secondary power quality issues

### Scenario 3: Weather-Related Multi-Station Impact
- **Mother Event**: Critical interruption from lightning strike (30+ minutes)
- **Child Events**: Lightning transient, voltage dip, secondary interruption  
- **Demonstrates**: Weather events causing multiple related disturbances

## 🚀 Features Demonstrated

### Child Events Tab
- ✅ Only visible for mother events
- ✅ Shows child event count in tab header
- ✅ Displays child events as clickable cards
- ✅ "Child" label for easy identification

### Navigation System
- ✅ Click child event → navigate to child details
- ✅ Back button appears when viewing child events
- ✅ Return to mother event preserves context
- ✅ All event details work normally for both mother and child events

### Data Relationships
- ✅ Proper parent_event_id linking
- ✅ is_mother_event and is_child_event flags
- ✅ Automatic grouping_type and timestamp
- ✅ Realistic timing relationships between events

## 🔧 Troubleshooting

### "No substations found" Error
Make sure you've seeded the basic database first:
```bash
# In the browser console
window.seedDatabase?.(); // If available
```

### "supabase is not defined" Error  
- Make sure you're running the script in the PQMAP application browser tab
- The application must be fully loaded before running the scripts
- Check that you're in the Console tab of Developer Tools

### Events Not Appearing
- Refresh the Event Management page after running the scripts
- Check the browser console for any errors during script execution
- Verify the date range in Event Management includes recent events

## 📊 Script Details

### `console-seed-mother-events.js`
- Creates 3 complete mother event scenarios from scratch
- Generates realistic waveform data for each event
- Sets up proper timing relationships between mother and child events
- Includes customer impact simulation

### `update-existing-events.js`  
- Converts existing events into mother-child relationships
- Groups events by substation and time proximity
- Creates up to 3 mother event groups from existing data
- Preserves original event data while adding grouping relationships

Both scripts are designed to run safely in the browser console and provide detailed progress logging.

## ✨ Next Steps

After generating the demo data:

1. **Test the full user workflow** from event discovery to resolution
2. **Verify the navigation system** works smoothly between events  
3. **Check that edit functionality** works for both mother and child events
4. **Ensure grouping operations** work with the new demo data
5. **Test the multi-select** functionality in the main Event Management list