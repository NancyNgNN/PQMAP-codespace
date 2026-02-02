import { supabase } from '../lib/supabase';
import { PQEvent } from '../types/database';

export interface GroupingResult {
  motherEventId: string;
  childEventIds: string[];
  groupingType: 'automatic' | 'manual';
  timestamp: string;
}

export interface GroupingCandidate {
  events: PQEvent[];
  substationId: string;
  substationName: string;
  timeWindow: {
    start: Date;
    end: Date;
  };
}

export class MotherEventGroupingService {
  
  /**
   * Automatically group events based on same substation + 10 minute time window
   * First event chronologically becomes the mother event
   * Only voltage_dip events can be grouped
   */
  static async performAutomaticGrouping(events: PQEvent[]): Promise<GroupingResult[]> {
    const results: GroupingResult[] = [];
    
    // Filter to only voltage_dip and voltage_swell events
    const groupableEvents = events.filter(e => 
      e.event_type === 'voltage_dip' || e.event_type === 'voltage_swell'
    );
    
    // Sort events by timestamp to ensure chronological processing
    const sortedEvents = [...groupableEvents].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group events by substation
    const eventsBySubstation = this.groupEventsBySubstation(sortedEvents);
    
    // Process each substation's events for temporal grouping
    for (const [, substationEvents] of eventsBySubstation.entries()) {
      const groupingResults = await this.findTemporalGroups(substationEvents);
      results.push(...groupingResults);
    }

    return results;
  }

  /**
   * Manually group selected events
   * First event in the selection becomes the mother event
   */
  static async performManualGrouping(eventIds: string[]): Promise<GroupingResult | null> {
    if (eventIds.length < 2) {
      throw new Error('At least 2 events are required for grouping');
    }

    // Fetch the events to verify they exist
    const { data: events, error } = await supabase
      .from('pq_events')
      .select('*')
      .in('id', eventIds)
      .order('timestamp', { ascending: true });

    if (error || !events || events.length !== eventIds.length) {
      throw new Error('Failed to fetch events for grouping');
    }

    // Use the first event chronologically as mother event
    const motherEvent = events[0];
    const childEventIds = events.slice(1).map(e => e.id);

    // Update the database
    await this.updateEventGrouping(motherEvent.id, childEventIds, 'manual');

    return {
      motherEventId: motherEvent.id,
      childEventIds,
      groupingType: 'manual',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add child events to an existing mother event
   * Used for expanding existing groups with new events
   */
  static async addChildrenToMotherEvent(motherEventId: string, childEventIds: string[]): Promise<boolean> {
    try {
      if (childEventIds.length === 0) {
        throw new Error('No child events provided');
      }

      // Validate mother event exists and is a mother
      const { data: motherEvent, error: motherFetchError } = await supabase
        .from('pq_events')
        .select('*')
        .eq('id', motherEventId)
        .single();

      if (motherFetchError || !motherEvent) {
        throw new Error('Mother event not found');
      }

      if (!motherEvent.is_mother_event) {
        throw new Error('Selected event is not a mother event');
      }

      // Validate child events are voltage_dip or voltage_swell and not already grouped
      const { data: childEvents, error: childFetchError } = await supabase
        .from('pq_events')
        .select('*')
        .in('id', childEventIds);

      if (childFetchError || !childEvents) {
        throw new Error('Failed to fetch child events');
      }

      // Validation checks
      const invalidEvents = childEvents.filter(e => 
        e.event_type !== 'voltage_dip' && e.event_type !== 'voltage_swell'
      );
      
      if (invalidEvents.length > 0) {
        throw new Error('Only voltage_dip and voltage_swell events can be added to groups');
      }

      const alreadyGrouped = childEvents.filter(e => 
        e.is_mother_event || e.parent_event_id
      );
      
      if (alreadyGrouped.length > 0) {
        throw new Error('Some events are already in a group');
      }

      // Check if all events are from same substation
      const differentSubstation = childEvents.some(e => 
        e.substation_id !== motherEvent.substation_id
      );
      
      if (differentSubstation) {
        throw new Error('All events must be from the same substation');
      }

      // Update child events to link to mother
      const { error: updateError } = await supabase
        .from('pq_events')
        .update({ 
          parent_event_id: motherEventId,
          is_child_event: true
        })
        .in('id', childEventIds);

      if (updateError) {
        throw updateError;
      }

      // Log the operation
      await this.logGroupingOperation('add_children', motherEventId, childEventIds);

      console.log(`✅ Added ${childEventIds.length} children to mother event ${motherEventId}`);
      return true;
    } catch (error) {
      console.error('❌ Error adding children to mother event:', error);
      return false;
    }
  }

  /**
   * Ungroup events - remove children from mother event
   */
  static async ungroupEvents(motherEventId: string): Promise<boolean> {
    try {
      // Find all child events
      const { data: childEvents, error: fetchError } = await supabase
        .from('pq_events')
        .select('id')
        .eq('parent_event_id', motherEventId);

      if (fetchError) {
        throw fetchError;
      }

      // Update mother event
      const { error: motherError } = await supabase
        .from('pq_events')
        .update({ 
          is_mother_event: false,
          grouping_type: null,
          grouped_at: null
        })
        .eq('id', motherEventId);

      // Update child events
      const { error: childError } = await supabase
        .from('pq_events')
        .update({ 
          parent_event_id: null,
          is_child_event: false
        })
        .eq('parent_event_id', motherEventId);

      if (motherError || childError) {
        throw motherError || childError;
      }

      // Log the ungrouping operation
      await this.logGroupingOperation('ungroup', motherEventId, childEvents?.map(e => e.id) || []);

      return true;
    } catch (error) {
      console.error('Error ungrouping events:', error);
      return false;
    }
  }

  /**
   * Ungroup specific child events from their mother event
   * Keeps other children grouped with the mother
   * Removes mother status only if no children remain after ungrouping
   */
  static async ungroupSpecificEvents(childEventIds: string[]): Promise<boolean> {
    try {
      if (childEventIds.length === 0) {
        throw new Error('No child events specified for ungrouping');
      }

      // Get the first child to find the mother event ID
      const { data: firstChild, error: fetchError } = await supabase
        .from('pq_events')
        .select('parent_event_id')
        .eq('id', childEventIds[0])
        .single();

      if (fetchError || !firstChild?.parent_event_id) {
        throw new Error('Failed to find parent event for child events');
      }

      const motherEventId = firstChild.parent_event_id;

      // Get event types of children being ungrouped
      const { data: childrenData, error: childFetchError } = await supabase
        .from('pq_events')
        .select('id, event_type')
        .in('id', childEventIds);

      if (childFetchError) {
        throw childFetchError;
      }

      // Update the selected child events
      // voltage_dip and voltage_swell become mother events when ungrouped
      // Other event types remain as standalone (non-mother, non-child)
      for (const child of childrenData || []) {
        const isVoltageDipOrSwell = child.event_type === 'voltage_dip' || child.event_type === 'voltage_swell';
        
        const { error: updateError } = await supabase
          .from('pq_events')
          .update({ 
            parent_event_id: null,
            is_child_event: false,
            is_mother_event: isVoltageDipOrSwell
          })
          .eq('id', child.id);

        if (updateError) {
          throw updateError;
        }
      }

      // Check if there are any remaining children
      const { data: remainingChildren, error: remainingError } = await supabase
        .from('pq_events')
        .select('id')
        .eq('parent_event_id', motherEventId);

      if (remainingError) {
        throw remainingError;
      }

      // If no children remain, remove mother event status
      if (!remainingChildren || remainingChildren.length === 0) {
        const { error: motherError } = await supabase
          .from('pq_events')
          .update({ 
            is_mother_event: false,
            grouping_type: null,
            grouped_at: null
          })
          .eq('id', motherEventId);

        if (motherError) {
          throw motherError;
        }
      }

      // Log the ungrouping operation
      await this.logGroupingOperation('ungroup_specific', motherEventId, childEventIds);

      return true;
    } catch (error) {
      console.error('Error ungrouping specific events:', error);
      return false;
    }
  }

  /**
   * Get grouping candidates for manual selection
   */
  static async getGroupingCandidates(timeWindowHours: number = 1): Promise<GroupingCandidate[]> {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - timeWindowHours * 60 * 60 * 1000);

    const { data: events, error } = await supabase
      .from('pq_events')
      .select(`
        *,
        substation:substation_id (
          id,
          name
        )
      `)
      .gte('timestamp', timeWindow.toISOString())
      .is('parent_event_id', null) // Only ungrouped events
      .order('timestamp', { ascending: true });

    if (error || !events) {
      return [];
    }

    // Group by substation and identify potential grouping opportunities
    const candidates: GroupingCandidate[] = [];
    const eventsBySubstation = this.groupEventsBySubstation(events);

    for (const [substationId, substationEvents] of eventsBySubstation.entries()) {
      if (substationEvents.length > 1) {
        const timeRange = this.getTimeRange(substationEvents);
        const substation = substationEvents[0].substation;
        
        candidates.push({
          events: substationEvents,
          substationId,
          substationName: substation?.name || 'Unknown',
          timeWindow: timeRange
        });
      }
    }

    return candidates;
  }

  /**
   * Private helper methods
   */

  private static groupEventsBySubstation(events: PQEvent[]): Map<string, PQEvent[]> {
    const grouped = new Map<string, PQEvent[]>();
    
    for (const event of events) {
      if (!event.substation_id) continue;
      
      if (!grouped.has(event.substation_id)) {
        grouped.set(event.substation_id, []);
      }
      grouped.get(event.substation_id)!.push(event);
    }
    
    return grouped;
  }

  private static async findTemporalGroups(events: PQEvent[]): Promise<GroupingResult[]> {
    const results: GroupingResult[] = [];
    const groupingWindow = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    // Filter out already grouped events
    const ungroupedEvents = events.filter(e => !e.parent_event_id && !e.is_mother_event);
    
    if (ungroupedEvents.length < 2) {
      return results;
    }

    let i = 0;
    while (i < ungroupedEvents.length) {
      const motherEvent = ungroupedEvents[i];
      const motherTime = new Date(motherEvent.timestamp).getTime();
      const childEvents: PQEvent[] = [];

      // Look for events within the 10-minute window
      for (let j = i + 1; j < ungroupedEvents.length; j++) {
        const candidateEvent = ungroupedEvents[j];
        const candidateTime = new Date(candidateEvent.timestamp).getTime();
        
        if (candidateTime - motherTime <= groupingWindow) {
          childEvents.push(candidateEvent);
        } else {
          // Events are sorted, so we can break early
          break;
        }
      }

      // If we found child events, create a group
      if (childEvents.length > 0) {
        await this.updateEventGrouping(
          motherEvent.id, 
          childEvents.map(e => e.id), 
          'automatic'
        );

        results.push({
          motherEventId: motherEvent.id,
          childEventIds: childEvents.map(e => e.id),
          groupingType: 'automatic',
          timestamp: new Date().toISOString()
        });

        // Skip the processed events
        i += childEvents.length + 1;
      } else {
        i++;
      }
    }

    return results;
  }

  private static async updateEventGrouping(
    motherEventId: string, 
    childEventIds: string[], 
    groupingType: 'automatic' | 'manual'
  ): Promise<void> {
    const now = new Date().toISOString();

    // Update mother event
    const { error: motherError } = await supabase
      .from('pq_events')
      .update({
        is_mother_event: true,
        grouping_type: groupingType,
        grouped_at: now
      })
      .eq('id', motherEventId);

    // Update child events
    const { error: childError } = await supabase
      .from('pq_events')
      .update({
        parent_event_id: motherEventId,
        is_child_event: true
      })
      .in('id', childEventIds);

    if (motherError) {
      throw new Error(`Failed to update mother event: ${motherError.message}`);
    }

    if (childError) {
      throw new Error(`Failed to update child events: ${childError.message}`);
    }

    // Log the grouping operation
    await this.logGroupingOperation(groupingType, motherEventId, childEventIds);
  }

  private static async logGroupingOperation(
    operation: 'automatic' | 'manual' | 'ungroup' | 'ungroup_specific',
    motherEventId: string,
    childEventIds: string[]
  ): Promise<void> {
    try {
      // This would be logged to an audit table in a real system
      console.log('Event Grouping Operation:', {
        operation,
        motherEventId,
        childEventIds,
        timestamp: new Date().toISOString(),
        eventCount: childEventIds.length + 1
      });
    } catch (error) {
      console.warn('Failed to log grouping operation:', error);
    }
  }

  private static getTimeRange(events: PQEvent[]): { start: Date; end: Date } {
    const timestamps = events.map(e => new Date(e.timestamp).getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps))
    };
  }

  /**
   * Utility method to check if events can be grouped
   */
  static canGroupEvents(events: PQEvent[]): { canGroup: boolean; reason?: string } {
    if (events.length < 2) {
      return { canGroup: false, reason: 'At least 2 events required for grouping' };
    }

    // Check if all events are voltage_dip or voltage_swell type
    const allGroupable = events.every(e => 
      e.event_type === 'voltage_dip' || e.event_type === 'voltage_swell'
    );
    if (!allGroupable) {
      return { canGroup: false, reason: 'Only voltage_dip and voltage_swell events can be grouped together' };
    }

    // Check if any events are already grouped
    const alreadyGrouped = events.some(e => e.parent_event_id || e.is_mother_event);
    if (alreadyGrouped) {
      return { canGroup: false, reason: 'Some events are already grouped' };
    }

    // Check if all events are from the same substation
    const substationIds = new Set(events.map(e => e.substation_id));
    if (substationIds.size > 1) {
      return { canGroup: false, reason: 'Events must be from the same substation for grouping' };
    }

    return { canGroup: true };
  }

  /**
   * Get statistics about grouping
   */
  static async getGroupingStatistics(): Promise<{
    totalGroups: number;
    automaticGroups: number;
    manualGroups: number;
    totalGroupedEvents: number;
  }> {
    try {
      const { data: motherEvents, error } = await supabase
        .from('pq_events')
        .select('grouping_type')
        .eq('is_mother_event', true);

      if (error || !motherEvents) {
        throw error;
      }

      const { data: allGroupedEvents, error: countError } = await supabase
        .from('pq_events')
        .select('id')
        .or('is_mother_event.eq.true,is_child_event.eq.true');

      if (countError) {
        throw countError;
      }

      const automaticGroups = motherEvents.filter(e => e.grouping_type === 'automatic').length;
      const manualGroups = motherEvents.filter(e => e.grouping_type === 'manual').length;

      return {
        totalGroups: motherEvents.length,
        automaticGroups,
        manualGroups,
        totalGroupedEvents: allGroupedEvents?.length || 0
      };
    } catch (error) {
      console.error('Error getting grouping statistics:', error);
      return {
        totalGroups: 0,
        automaticGroups: 0,
        manualGroups: 0,
        totalGroupedEvents: 0
      };
    }
  }
}