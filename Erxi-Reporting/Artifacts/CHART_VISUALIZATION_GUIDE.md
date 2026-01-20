# Chart Visualization Guide

## Overview
The Profile tab now features **fully functional chart visualization** using a custom-built LineChart component that displays real-time voltage and current data for selected PQ meters.

## Chart Features

### Visual Elements
- **Real-time Data Rendering**: SVG-based line charts with smooth curves
- **Multi-Parameter Display**: Shows V1, V2, V3 (voltage) or I1, I2, I3 (current) simultaneously
- **Color Coding**:
  - Phase 1 (V1/I1): Black
  - Phase 2 (V2/I2): Red
  - Phase 3 (V3/I3): Blue
- **Grid System**: 5x5 grid lines for easy data reading
- **Auto-Scaling**: Y-axis automatically adjusts to data range with 10% padding
- **Time Labels**: Formatted timestamps on X-axis showing date and time

### Data Characteristics

#### Voltage Data
- **Base Values**:
  - 400KV meters: 240,000V (240kV line-to-ground)
  - 132KV meters: 76,000V (76kV line-to-ground)
  - 33KV meters: 19,000V (19kV line-to-ground)
  - 11KV meters: 6,350V (6.35kV line-to-ground)
  - 380V meters: 220V (220V line-to-ground)

- **Variation Pattern**:
  - Sine wave oscillation (period: ~10 data points)
  - Amplitude: ±1% of base voltage
  - Random noise: ±1.5% additional variation
  - Simulates natural grid fluctuations

#### Current Data
- **Base Values**:
  - 400KV meters: 1000A
  - 132KV meters: 800A
  - 33KV meters: 500A
  - 11KV meters: 300A
  - 380V meters: 100A

- **Variation Pattern**:
  - Sine wave oscillation (period: ~8 data points)
  - Amplitude: ±15% of base current
  - Random noise: ±10% additional variation
  - Simulates load variations throughout day

### Data Points
- **Quantity**: Up to 365 points per chart
- **Distribution**: Evenly spaced across selected date range
- **Format**: ISO 8601 timestamps for precise time tracking

## Technical Implementation

### LineChart Component
**Location**: `/workspaces/PQMAP/src/components/Charts/LineChart.tsx`

**Architecture**:
```
LineChart
├── Title (Meter ID)
├── Y-Axis Labels (min, mid, max)
├── SVG Chart Area
│   ├── Grid Lines (5x5)
│   ├── Data Lines (V1/V2/V3 or I1/I2/I3)
│   └── Responsive Scaling
├── X-Axis Labels (start/end timestamps)
└── Legend (color indicators)
```

**Data Flow**:
1. User clicks "GET PROFILE RESULT"
2. `handleGetProfileResult()` validates selections
3. `generateMockVoltageData()` creates time-series data for each meter
4. Data stored in `profileChartData` state
5. LineChart component receives data and renders SVG paths

### Performance Optimization
- **Lazy Rendering**: Charts only render after "GET PROFILE RESULT" clicked
- **Limited Points**: Maximum 365 data points prevents performance issues
- **Efficient SVG**: Uses path commands instead of individual elements
- **Slice Display**: Shows maximum 4 charts at once (2x2 grid)

## Usage Instructions

### Viewing Charts
1. Navigate to **Reporting > Profile** tab
2. Select filters:
   - Data type: Daily Average or Raw Data
   - Voltage level: All, 400KV, 132KV, 33KV, 11KV, or 380V
   - Date range: From/To dates (max 1 year)
3. Toggle data type: Voltage or Current
4. Select up to 10 meters from the list
5. Click **GET PROFILE RESULT** button
6. Charts appear in 2x2 grid layout

### Interacting with Charts
- **Toggle Parameters**: Use checkboxes to show/hide V1/V2/V3 or I1/I2/I3
- **Export Data**: Click CSV button to download all chart data
- **Copy Chart**: Click Copy button to copy chart data to clipboard
- **Save Configuration**: Click "Save Profile" to store current settings
- **Load Saved**: Click "Load Profile" to restore previous configurations

### Reading Chart Data
- **Y-Axis**: Shows voltage (V) or current (A) values
  - Top label: Maximum value in dataset
  - Middle label: Average value
  - Bottom label: Minimum value
- **X-Axis**: Shows time range
  - Left label: Start timestamp
  - Right label: End timestamp
- **Lines**: Each colored line represents one phase
  - Hover concepts can be added for precise values
- **Grid**: Reference lines for estimating values

## Data Interpretation

### Normal Operation
- **Voltage**: Should stay within ±5% of nominal value
  - Steady sine wave pattern indicates stable grid
  - Small variations are normal due to load changes
  
- **Current**: Can vary significantly based on load
  - Higher during peak hours (morning, evening)
  - Lower during off-peak hours (night, early morning)
  - Variations of ±30% are typical

### Anomaly Detection
- **Voltage Dips**: Sharp downward spikes below -10%
- **Voltage Swells**: Sharp upward spikes above +10%
- **Imbalance**: One phase significantly different from others
- **Noise**: Excessive random fluctuations indicate power quality issues

## Export Format

### CSV Structure
```csv
Meter ID,Timestamp,V1,V2,V3
PQMS_400KV.APA0001_H1,2025-01-01T00:00:00.000Z,239850.45,240120.30,239980.15
PQMS_400KV.APA0001_H1,2025-01-01T01:00:00.000Z,240100.20,240050.80,240200.45
...
```

- **Meter ID**: Full meter identifier
- **Timestamp**: ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- **V1/V2/V3**: Phase voltages in volts (or I1/I2/I3 for current in amperes)

## Future Enhancements

### Planned Features
1. **Zoom/Pan**: Interactive chart navigation
2. **Tooltips**: Hover to see exact values
3. **Comparison Mode**: Overlay multiple meters on one chart
4. **Anomaly Highlighting**: Automatic detection and marking of events
5. **Real-time Updates**: Connect to live meter data streams
6. **Export to PNG**: Save chart images for reports
7. **Advanced Filtering**: Filter by time of day, day of week
8. **Statistical Analysis**: Min/max/avg overlays, standard deviation bands

### Database Integration
When connected to Supabase:
- Fetch real data from `meter_voltage_readings` table
- Query optimization using indexes
- Pagination for large datasets
- Caching for improved performance

## Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile**: Responsive design adapts to screen size

## Troubleshooting

### Charts Not Showing
- Ensure at least 1 meter is selected
- Check date range is valid (max 1 year)
- Verify "GET PROFILE RESULT" button was clicked

### Performance Issues
- Reduce number of selected meters (max 4 displayed)
- Shorten date range for faster generation
- Close other browser tabs to free memory

### Data Looks Wrong
- Voltage/Current units are correct (volts/amperes, not kV/kA)
- Values include natural variations (not constant)
- Check correct data type is selected (Voltage vs Current)

## Support
For technical issues or enhancement requests, please refer to:
- [PROFILE_TAB_IMPLEMENTATION.md](./PROFILE_TAB_IMPLEMENTATION.md)
- [PROJECT_FUNCTION_DESIGN.md](./PROJECT_FUNCTION_DESIGN.md)
