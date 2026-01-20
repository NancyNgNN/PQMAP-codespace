// Debug Mother Events - Console Script
// Run this in the browser console to check the mother events and their children

(async function debugMotherEvents() {
  console.log('🔍 Debugging Mother Events and Child Relationships');
  console.log('================================================');
  
  // Check if we have access to supabase
  if (typeof window === 'undefined' || !window.supabase) {
    console.error('❌ This script must be run in the browser with access to the Supabase client.');
    return;
  }
  
  const supabase = window.supabase;
  
  try {
    // Get all events with mother event flag
    console.log('\n1️⃣ Checking all events marked as mother events...');
    const { data: motherEvents, error: motherError } = await supabase
      .from('pq_events')
      .select(`
        id, 
        event_type, 
        timestamp, 
        is_mother_event, 
        is_child_event, 
        parent_event_id,
        root_cause,
        substation_id,
        substation:substation_id(name)
      `)
      .eq('is_mother_event', true)
      .order('timestamp', { ascending: false })
      .limit(10);
      
    if (motherError) {
      console.error('❌ Error fetching mother events:', motherError);
      return;
    }
    
    if (!motherEvents || motherEvents.length === 0) {
      console.log('❌ No mother events found in database');
      console.log('🔍 Let\'s check if any events have is_mother_event column...');
      
      const { data: allEvents, error: allError } = await supabase
        .from('pq_events')
        .select('id, event_type, is_mother_event, parent_event_id')
        .limit(5);
        
      if (allError) {
        console.log('❌ Error checking events:', allError);
      } else {
        console.log('📊 Sample events structure:');
        console.table(allEvents);
      }
      return;
    }
    
    console.log(`✅ Found ${motherEvents.length} mother events:`);
    motherEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.id} - ${event.event_type} at ${event.substation?.name || 'Unknown'}`);
      console.log(`      Root cause: ${event.root_cause}`);
    });
    
    // For each mother event, check its children
    console.log('\n2️⃣ Checking child events for each mother event...');
    
    for (let i = 0; i < motherEvents.length; i++) {
      const motherEvent = motherEvents[i];
      console.log(`\n🔍 Mother Event ${i + 1}: ${motherEvent.id.substring(0, 8)}...`);
      
      const { data: childEvents, error: childError } = await supabase
        .from('pq_events')
        .select(`
          id, 
          event_type, 
          timestamp, 
          is_child_event, 
          parent_event_id,
          substation:substation_id(name)
        `)
        .eq('parent_event_id', motherEvent.id)
        .order('timestamp', { ascending: true });
        
      if (childError) {
        console.error(`   ❌ Error fetching children:`, childError);
        continue;
      }
      
      if (!childEvents || childEvents.length === 0) {
        console.log(`   ❌ No child events found for this mother event`);
        
        // Check if there are any events with this as parent_event_id
        const { data: anyChildren } = await supabase
          .from('pq_events')
          .select('id, parent_event_id')
          .not('parent_event_id', 'is', null)
          .limit(5);
          
        console.log(`   📊 Debug: Events with parent_event_id (any):`, anyChildren);
      } else {
        console.log(`   ✅ Found ${childEvents.length} child events:`);
        childEvents.forEach((child, childIndex) => {
          console.log(`      ${childIndex + 1}. ${child.id.substring(0, 8)}... - ${child.event_type}`);
          console.log(`         Parent ID: ${child.parent_event_id}`);
          console.log(`         Is child: ${child.is_child_event}`);
        });
      }
    }
    
    // Check if there are orphaned child events (is_child_event=true but no matching parent)
    console.log('\n3️⃣ Checking for orphaned child events...');
    const { data: orphanedChildren } = await supabase
      .from('pq_events')
      .select('id, event_type, parent_event_id, is_child_event')
      .eq('is_child_event', true)
      .limit(10);
      
    if (orphanedChildren && orphanedChildren.length > 0) {
      console.log(`✅ Found ${orphanedChildren.length} events marked as children:`);
      orphanedChildren.forEach((child, index) => {
        console.log(`   ${index + 1}. ${child.id.substring(0, 8)}... - Parent: ${child.parent_event_id}`);
      });
    } else {
      console.log('❌ No events found with is_child_event = true');
    }
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`   • Mother events found: ${motherEvents.length}`);
    console.log(`   • Checking child relationships...`);
    
    // Check data consistency
    const { data: allEventRelations } = await supabase
      .from('pq_events')
      .select('id, is_mother_event, is_child_event, parent_event_id')
      .or('is_mother_event.eq.true,is_child_event.eq.true,parent_event_id.not.is.null')
      .limit(20);
      
    console.log('\n🔬 Event relationship data:');
    console.table(allEventRelations);
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
})();