// Quick Script to Update Existing Events as Mother Events
// Run this in the browser console to convert some existing events to mother events

(async function updateExistingEventsToMotherEvents() {
  console.log('🔧 Converting existing events to mother event groups...');
  
  // Check if we have access to supabase
  if (typeof window === 'undefined' || !window.supabase) {
    console.error('❌ This script must be run in the browser with access to the Supabase client.');
    return;
  }
  
  const supabase = window.supabase;
  
  try {
    // Get some existing events
    const { data: events, error: eventsError } = await supabase
      .from('pq_events')
      .select('id, event_type, substation_id, timestamp, severity')
      .order('timestamp', { ascending: false })
      .limit(30);
      
    if (eventsError || !events || events.length < 5) {
      console.error('❌ Need at least 5 existing events. Please seed the database first.');
      return;
    }
    
    console.log(`📡 Found ${events.length} existing events`);
    
    // Group events by substation and time proximity
    const eventGroups = [];
    const usedEventIds = new Set();
    
    for (let i = 0; i < events.length - 2; i++) {
      const motherEvent = events[i];
      
      if (usedEventIds.has(motherEvent.id)) continue;
      
      // Find potential child events (same substation, within 10 minutes, not used)
      const potentialChildren = events.slice(i + 1).filter(event => {
        if (usedEventIds.has(event.id)) return false;
        
        const timeDiff = Math.abs(new Date(event.timestamp) - new Date(motherEvent.timestamp));
        const withinTimeWindow = timeDiff <= 10 * 60 * 1000; // 10 minutes
        const sameOrNearbySubstation = event.substation_id === motherEvent.substation_id;
        
        return withinTimeWindow && sameOrNearbySubstation;
      }).slice(0, 3); // Max 3 children
      
      if (potentialChildren.length >= 2) {
        eventGroups.push({
          mother: motherEvent,
          children: potentialChildren
        });
        
        usedEventIds.add(motherEvent.id);
        potentialChildren.forEach(child => usedEventIds.add(child.id));
        
        if (eventGroups.length >= 3) break; // Create 3 groups max
      }
    }
    
    console.log(`🎯 Creating ${eventGroups.length} mother event groups...`);
    
    // Update events to create mother-child relationships
    for (let groupIndex = 0; groupIndex < eventGroups.length; groupIndex++) {
      const group = eventGroups[groupIndex];
      
      console.log(`\n📝 Group ${groupIndex + 1}:`);
      
      // Update mother event
      const { error: motherUpdateError } = await supabase
        .from('pq_events')
        .update({
          is_mother_event: true,
          is_child_event: false,
          parent_event_id: null,
          grouping_type: 'automatic',
          grouped_at: new Date().toISOString(),
          root_cause: group.mother.root_cause || `Group ${groupIndex + 1} - Primary event causing cascading effects`
        })
        .eq('id', group.mother.id);
        
      if (motherUpdateError) {
        console.error(`   ❌ Error updating mother event:`, motherUpdateError);
        continue;
      }
      
      console.log(`   ✅ Mother: ${group.mother.id.substring(0, 8)}... (${group.mother.event_type})`);
      
      // Update child events
      for (let childIndex = 0; childIndex < group.children.length; childIndex++) {
        const child = group.children[childIndex];
        
        const { error: childUpdateError } = await supabase
          .from('pq_events')
          .update({
            is_mother_event: false,
            is_child_event: true,
            parent_event_id: group.mother.id,
            grouping_type: 'automatic',
            grouped_at: new Date().toISOString(),
            root_cause: child.root_cause || `Related to primary event - Cascading effect ${childIndex + 1}`
          })
          .eq('id', child.id);
          
        if (childUpdateError) {
          console.error(`   ❌ Error updating child event ${childIndex + 1}:`, childUpdateError);
        } else {
          console.log(`   ✅ Child ${childIndex + 1}: ${child.id.substring(0, 8)}... (${child.event_type})`);
        }
      }
    }
    
    console.log(`\n✨ Successfully created ${eventGroups.length} mother event groups!`);
    
    // Summary
    const totalUpdated = eventGroups.reduce((sum, group) => sum + 1 + group.children.length, 0);
    console.log(`📊 Summary:`);
    console.log(`   • ${eventGroups.length} mother events created`);
    console.log(`   • ${eventGroups.reduce((sum, group) => sum + group.children.length, 0)} child events linked`);
    console.log(`   • ${totalUpdated} total events updated`);
    
    console.log('\n📋 How to test:');
    console.log('   1. Reload the Event Management page');
    console.log('   2. Look for events with "Mother Event" label');
    console.log('   3. Click on a mother event to view details');
    console.log('   4. Use the "Child Events" tab to see linked events');
    console.log('   5. Navigate between mother and child events');
    
    return { success: true, groupsCreated: eventGroups.length, totalUpdated };
    
  } catch (error) {
    console.error('❌ Error updating events:', error);
    return { success: false, error: error.message };
  }
})();