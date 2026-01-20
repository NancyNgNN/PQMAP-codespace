-- Migration: Add missing columns to pq_events and pq_meters for SARFI functionality
-- Date: 2025-12-09

-- Add missing columns to pq_events table
ALTER TABLE pq_events
ADD COLUMN IF NOT EXISTS voltage_level TEXT,
ADD COLUMN IF NOT EXISTS circuit_id TEXT,
ADD COLUMN IF NOT EXISTS customer_count INTEGER,
ADD COLUMN IF NOT EXISTS remaining_voltage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS validated_by_adms BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_special_event BOOLEAN DEFAULT FALSE;

-- Add missing columns to pq_meters table for better organization
ALTER TABLE pq_meters
ADD COLUMN IF NOT EXISTS meter_type TEXT DEFAULT 'PQ Monitor',
ADD COLUMN IF NOT EXISTS voltage_level TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pq_events_voltage_level ON pq_events(voltage_level);
CREATE INDEX IF NOT EXISTS idx_pq_events_circuit_id ON pq_events(circuit_id);
CREATE INDEX IF NOT EXISTS idx_pq_events_validated ON pq_events(validated_by_adms);
CREATE INDEX IF NOT EXISTS idx_pq_events_special ON pq_events(is_special_event);
CREATE INDEX IF NOT EXISTS idx_pq_meters_voltage_level ON pq_meters(voltage_level);

-- Add comments for documentation
COMMENT ON COLUMN pq_events.voltage_level IS 'Voltage level at which the event occurred (e.g., 400kV, 132kV, 11kV, 380V)';
COMMENT ON COLUMN pq_events.circuit_id IS 'Circuit identifier associated with the event';
COMMENT ON COLUMN pq_events.customer_count IS 'Number of customers affected by the event';
COMMENT ON COLUMN pq_events.remaining_voltage IS 'Remaining voltage during the event as percentage';
COMMENT ON COLUMN pq_events.validated_by_adms IS 'Whether the event has been validated by ADMS (Advanced Distribution Management System)';
COMMENT ON COLUMN pq_events.is_special_event IS 'Flag for special events that should be excluded from certain calculations';
COMMENT ON COLUMN pq_meters.meter_type IS 'Type of meter (e.g., PQ Monitor, Smart Meter)';
COMMENT ON COLUMN pq_meters.voltage_level IS 'Voltage level at which the meter operates';
