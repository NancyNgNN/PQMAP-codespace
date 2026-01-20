-- ==========================================
-- STEP 1: Apply this migration first
-- This adds the content column and new service types
-- ==========================================

-- Run the migration file: 20251218000001_update_pq_service_records.sql
-- (Copy the entire content from that file and run it in Supabase SQL Editor)

-- ==========================================
-- STEP 2: Backfill historical PQ service records
-- Run this after the migration is applied
-- ==========================================

-- This script creates realistic historical PQ service records
-- Adjust the date ranges and quantities as needed

DO $$
DECLARE
  v_customer_id UUID;
  v_engineer_id UUID;
  v_service_date DATE;
  v_service_type TEXT;
  v_benchmark_standard TEXT;
  v_event_id UUID;
  i INTEGER;
BEGIN
  -- Get a profile ID for engineer assignment
  SELECT id INTO v_engineer_id FROM profiles LIMIT 1;

  -- Loop through customers and create service records
  FOR v_customer_id IN (SELECT id FROM customers ORDER BY name LIMIT 20)
  LOOP
    -- Create 3-8 random service records per customer over the past 2 years
    FOR i IN 1..(3 + floor(random() * 6)::int)
    LOOP
      -- Random date in past 2 years
      v_service_date := CURRENT_DATE - (floor(random() * 730)::int || ' days')::interval;
      
      -- Random service type
      v_service_type := (ARRAY['site_survey', 'harmonic_analysis', 'consultation', 
                                'on_site_study', 'power_quality_audit', 'installation_support'])[
                          1 + floor(random() * 6)::int
                        ];
      
      -- Random benchmark standard (50% chance of having one)
      IF random() > 0.5 THEN
        v_benchmark_standard := (ARRAY['IEEE 519', 'IEC 61000', 'ITIC Curve', 'SEMI F47', 'EN 50160'])[
                                  1 + floor(random() * 5)::int
                                ];
      ELSE
        v_benchmark_standard := NULL;
      END IF;
      
      -- 20% chance of linking to a random event (if events exist)
      IF random() > 0.8 THEN
        SELECT id INTO v_event_id FROM pq_events ORDER BY random() LIMIT 1;
      ELSE
        v_event_id := NULL;
      END IF;
      
      -- Insert service record with varied content
      INSERT INTO pq_service_records (
        id,
        customer_id,
        service_date,
        service_type,
        event_id,
        findings,
        recommendations,
        benchmark_standard,
        engineer_id,
        content,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_customer_id,
        v_service_date,
        v_service_type,
        v_event_id,
        -- Varied findings based on service type
        CASE v_service_type
          WHEN 'site_survey' THEN 
            'Site inspection completed. ' || (ARRAY[
              'Power quality monitoring equipment installed at critical points.',
              'Voltage levels within acceptable ranges. Minor fluctuations during peak hours.',
              'Grounding system inspection completed. No issues found.',
              'Load distribution appears balanced across phases.'
            ])[1 + floor(random() * 4)::int]
          WHEN 'harmonic_analysis' THEN
            'Harmonic analysis conducted. ' || (ARRAY[
              'THD levels at ' || (floor(random() * 10) + 2)::text || '%. Within IEEE 519 limits.',
              'Elevated 5th and 7th harmonics detected from VFD equipment.',
              'Harmonic distortion minimal. No filtering required at this time.',
              'Total harmonic distortion exceeds recommended levels during peak operation.'
            ])[1 + floor(random() * 4)::int]
          WHEN 'consultation' THEN
            'Consultation session completed. ' || (ARRAY[
              'Discussed power quality concerns with facility management.',
              'Reviewed recent power quality events and their impacts.',
              'Provided guidance on equipment specifications for upcoming upgrades.',
              'Explained voltage tolerance requirements for sensitive equipment.'
            ])[1 + floor(random() * 4)::int]
          WHEN 'on_site_study' THEN
            'On-site power quality study. ' || (ARRAY[
              'Comprehensive measurements taken over 7-day period.',
              'Transient overvoltage events documented during switching operations.',
              'Power factor measurements indicate need for correction.',
              'Voltage unbalance within acceptable limits.'
            ])[1 + floor(random() * 4)::int]
          WHEN 'power_quality_audit' THEN
            'Power quality audit completed. ' || (ARRAY[
              'Overall power quality meets industry standards.',
              'Several areas identified for improvement in grounding and bonding.',
              'Surge protection devices functioning correctly.',
              'Voltage sag ride-through capability verified for critical loads.'
            ])[1 + floor(random() * 4)::int]
          ELSE
            'Installation support provided. ' || (ARRAY[
              'New PQ monitoring equipment installed and commissioned.',
              'Assisted with power factor correction capacitor installation.',
              'UPS system installation supervised and tested.',
              'Harmonic filter installation completed successfully.'
            ])[1 + floor(random() * 4)::int]
        END,
        -- Varied recommendations
        CASE v_service_type
          WHEN 'site_survey' THEN
            (ARRAY[
              'Continue monitoring for 30 days. Schedule follow-up review.',
              'Consider installing voltage regulators for sensitive equipment.',
              'Upgrade grounding system at identified locations.',
              'Implement load balancing measures during next maintenance window.'
            ])[1 + floor(random() * 4)::int]
          WHEN 'harmonic_analysis' THEN
            (ARRAY[
              'Install passive harmonic filters on VFD panels.',
              'Continue monitoring. Current levels acceptable.',
              'Consider active harmonic filtering solution for future expansion.',
              'Implement IEEE 519 compliant filtering within 6 months.'
            ])[1 + floor(random() * 4)::int]
          WHEN 'consultation' THEN
            (ARRAY[
              'Schedule detailed site survey for comprehensive assessment.',
              'Review equipment specifications before procurement.',
              'Implement recommended monitoring strategy.',
              'Consider power quality training for operations staff.'
            ])[1 + floor(random() * 4)::int]
          WHEN 'on_site_study' THEN
            (ARRAY[
              'Analyze collected data and prepare detailed report.',
              'Install additional monitoring points in identified areas.',
              'Implement surge protection at vulnerable equipment.',
              'Schedule power factor correction system installation.'
            ])[1 + floor(random() * 4)::int]
          WHEN 'power_quality_audit' THEN
            (ARRAY[
              'Address grounding deficiencies within 90 days.',
              'Continue annual power quality audits.',
              'Update surge protection devices reaching end of life.',
              'Implement recommended improvements in priority order.'
            ])[1 + floor(random() * 4)::int]
          ELSE
            (ARRAY[
              'Monitor new equipment performance for 30 days.',
              'Schedule commissioning tests after 7-day burn-in period.',
              'Provide operations training on new equipment.',
              'Include new equipment in regular maintenance schedule.'
            ])[1 + floor(random() * 4)::int]
        END,
        v_benchmark_standard,
        v_engineer_id,
        -- Rich text content
        '<p><strong>Service Summary:</strong></p>' ||
        '<p>Service performed on ' || v_service_date::text || ' by engineering team.</p>' ||
        '<ul>' ||
        '<li>Duration: ' || (2 + floor(random() * 6)::int)::text || ' hours</li>' ||
        '<li>Equipment tested: ' || (5 + floor(random() * 15)::int)::text || ' items</li>' ||
        '<li>Measurements recorded: ' || (20 + floor(random() * 80)::int)::text || ' data points</li>' ||
        '</ul>' ||
        '<p><strong>Key Observations:</strong></p>' ||
        '<p>' || (ARRAY[
          'All safety protocols followed during service visit.',
          'Customer facilities in good condition.',
          'Operations team cooperative and knowledgeable.',
          'Access to equipment areas provided as scheduled.',
          'Environmental conditions within normal parameters.'
        ])[1 + floor(random() * 5)::int] || '</p>' ||
        '<p><strong>Follow-up Required:</strong></p>' ||
        '<p>' || (ARRAY[
          'Schedule follow-up visit in 3 months.',
          'Send detailed technical report within 5 business days.',
          'No immediate follow-up required.',
          'Coordinate with customer for next phase implementation.',
          'Monitor remotely for 30 days before next assessment.'
        ])[1 + floor(random() * 5)::int] || '</p>',
        v_service_date
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfill completed successfully!';
END $$;

-- Verify the results
SELECT 
  COUNT(*) as total_services,
  service_type,
  COUNT(DISTINCT customer_id) as unique_customers
FROM pq_service_records
GROUP BY service_type
ORDER BY service_type;

-- Check date distribution
SELECT 
  DATE_TRUNC('month', service_date) as month,
  COUNT(*) as services_count
FROM pq_service_records
GROUP BY month
ORDER BY month DESC
LIMIT 12;

-- Show sample records
SELECT 
  c.name as customer_name,
  s.service_date,
  s.service_type,
  s.benchmark_standard,
  p.full_name as engineer_name
FROM pq_service_records s
JOIN customers c ON s.customer_id = c.id
LEFT JOIN profiles p ON s.engineer_id = p.id
ORDER BY s.service_date DESC
LIMIT 10;
