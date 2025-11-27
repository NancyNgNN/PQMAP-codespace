// False Event Detection Algorithms and Logic

export interface FalseEventDetectionResult {
  isFalsePositive: boolean;
  confidence: number; // 0-100
  reasons: string[];
  triggeredRules: string[];
  recommendedAction: 'ignore' | 'review' | 'flag' | 'auto-remove';
}

export interface EventPattern {
  eventType: string;
  typicalDuration: { min: number; max: number };
  typicalMagnitude: { min: number; max: number };
  commonCauses: string[];
  falsePositiveIndicators: string[];
}

export interface DetectionAlgorithm {
  name: string;
  description: string;
  weight: number; // Algorithm importance weight
  evaluate: (event: any, context: DetectionContext) => { score: number; reasons: string[] };
}

export interface DetectionContext {
  recentEvents: any[];
  historicalData: any[];
  maintenanceWindows: { start: string; end: string; substation?: string }[];
  weatherData?: { timestamp: string; conditions: string }[];
  systemStatus: 'normal' | 'maintenance' | 'emergency';
}

// Event pattern definitions for different event types
const EVENT_PATTERNS: Record<string, EventPattern> = {
  voltage_dip: {
    eventType: 'voltage_dip',
    typicalDuration: { min: 100, max: 5000 },
    typicalMagnitude: { min: 10, max: 50 },
    commonCauses: ['Motor starting', 'Transformer switching', 'Fault clearing'],
    falsePositiveIndicators: [
      'Duration < 50ms',
      'Magnitude < 5%',
      'No concurrent events',
      'During maintenance window'
    ]
  },
  voltage_swell: {
    eventType: 'voltage_swell',
    typicalDuration: { min: 100, max: 3000 },
    typicalMagnitude: { min: 5, max: 30 },
    commonCauses: ['Load rejection', 'Capacitor switching', 'Ferroresonance'],
    falsePositiveIndicators: [
      'Duration < 100ms',
      'Magnitude < 3%',
      'No load change pattern',
      'Isolated event'
    ]
  },
  interruption: {
    eventType: 'interruption',
    typicalDuration: { min: 1000, max: 300000 },
    typicalMagnitude: { min: 80, max: 100 },
    commonCauses: ['Protective relay operation', 'Equipment failure', 'Planned outage'],
    falsePositiveIndicators: [
      'Duration < 500ms',
      'Partial voltage present',
      'No protection operation',
      'Scheduled maintenance'
    ]
  },
  harmonic: {
    eventType: 'harmonic',
    typicalDuration: { min: 5000, max: 3600000 },
    typicalMagnitude: { min: 3, max: 20 },
    commonCauses: ['Non-linear loads', 'Power electronic devices', 'Arc furnaces'],
    falsePositiveIndicators: [
      'THD < 2%',
      'No non-linear load pattern',
      'Measurement error indicators',
      'Temporary distortion'
    ]
  },
  transient: {
    eventType: 'transient',
    typicalDuration: { min: 1, max: 100 },
    typicalMagnitude: { min: 100, max: 2000 },
    commonCauses: ['Lightning', 'Switching operations', 'Capacitor energizing'],
    falsePositiveIndicators: [
      'No weather correlation',
      'No switching operations',
      'Measurement noise pattern',
      'Multiple similar events in short time'
    ]
  },
  flicker: {
    eventType: 'flicker',
    typicalDuration: { min: 10000, max: 600000 },
    typicalMagnitude: { min: 0.5, max: 10 },
    commonCauses: ['Arc furnaces', 'Welding equipment', 'Motor starting'],
    falsePositiveIndicators: [
      'No cyclic pattern',
      'Pst < 0.5',
      'No industrial load correlation',
      'Random voltage variations'
    ]
  }
};

// Detection algorithms
export class FalseEventDetector {
  private algorithms: DetectionAlgorithm[] = [];

  constructor() {
    this.initializeAlgorithms();
  }

  private initializeAlgorithms() {
    this.algorithms = [
      {
        name: 'Duration-Based Detection',
        description: 'Detects events with unrealistic durations',
        weight: 0.2,
        evaluate: this.evaluateDuration.bind(this)
      },
      {
        name: 'Magnitude Analysis',
        description: 'Identifies events with insignificant magnitudes',
        weight: 0.15,
        evaluate: this.evaluateMagnitude.bind(this)
      },
      {
        name: 'Frequency Pattern Analysis',
        description: 'Detects suspicious event frequency patterns',
        weight: 0.2,
        evaluate: this.evaluateFrequencyPattern.bind(this)
      },
      {
        name: 'Waveform Quality Assessment',
        description: 'Analyzes waveform data for measurement noise',
        weight: 0.15,
        evaluate: this.evaluateWaveformQuality.bind(this)
      },
      {
        name: 'Temporal Correlation Analysis',
        description: 'Checks for logical temporal relationships',
        weight: 0.1,
        evaluate: this.evaluateTemporalCorrelation.bind(this)
      },
      {
        name: 'System State Analysis',
        description: 'Considers maintenance windows and system status',
        weight: 0.1,
        evaluate: this.evaluateSystemState.bind(this)
      },
      {
        name: 'Physics-Based Validation',
        description: 'Validates events against power system physics',
        weight: 0.1,
        evaluate: this.evaluatePhysicsConsistency.bind(this)
      }
    ];
  }

  public detectFalseEvents(event: any, context: DetectionContext): FalseEventDetectionResult {
    let totalScore = 0;
    let totalWeight = 0;
    const allReasons: string[] = [];
    const triggeredRules: string[] = [];

    // Run all detection algorithms
    for (const algorithm of this.algorithms) {
      const result = algorithm.evaluate(event, context);
      totalScore += result.score * algorithm.weight;
      totalWeight += algorithm.weight;
      
      if (result.score > 0.5) {
        triggeredRules.push(algorithm.name);
        allReasons.push(...result.reasons);
      }
    }

    const confidence = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
    const isFalsePositive = confidence > 70; // 70% threshold

    let recommendedAction: 'ignore' | 'review' | 'flag' | 'auto-remove' = 'ignore';
    if (confidence > 90) {
      recommendedAction = 'auto-remove';
    } else if (confidence > 70) {
      recommendedAction = 'flag';
    } else if (confidence > 50) {
      recommendedAction = 'review';
    }

    return {
      isFalsePositive,
      confidence,
      reasons: allReasons,
      triggeredRules,
      recommendedAction
    };
  }

  private evaluateDuration(event: any, context: DetectionContext): { score: number; reasons: string[] } {
    const pattern = EVENT_PATTERNS[event.event_type];
    const reasons: string[] = [];
    let score = 0;

    if (!pattern || !event.duration_ms) {
      return { score: 0, reasons: [] };
    }

    // Check if duration is too short
    if (event.duration_ms < pattern.typicalDuration.min) {
      const shortnessFactor = pattern.typicalDuration.min / event.duration_ms;
      if (shortnessFactor > 10) {
        score = 0.9;
        reasons.push(`Duration extremely short (${event.duration_ms}ms vs typical ${pattern.typicalDuration.min}ms+)`);
      } else if (shortnessFactor > 2) {
        score = 0.6;
        reasons.push(`Duration unusually short for ${event.event_type}`);
      }
    }

    // Check if duration is unrealistically long
    if (event.duration_ms > pattern.typicalDuration.max * 10) {
      score = Math.max(score, 0.7);
      reasons.push(`Duration unrealistically long (${event.duration_ms}ms vs typical max ${pattern.typicalDuration.max}ms)`);
    }

    return { score, reasons };
  }

  private evaluateMagnitude(event: any, context: DetectionContext): { score: number; reasons: string[] } {
    const pattern = EVENT_PATTERNS[event.event_type];
    const reasons: string[] = [];
    let score = 0;

    if (!pattern || event.magnitude === null || event.magnitude === undefined) {
      return { score: 0, reasons: [] };
    }

    // Check if magnitude is too small to be significant
    if (event.magnitude < pattern.typicalMagnitude.min) {
      const insignificanceFactor = pattern.typicalMagnitude.min / event.magnitude;
      if (insignificanceFactor > 5) {
        score = 0.8;
        reasons.push(`Magnitude too small to be significant (${event.magnitude}% vs typical ${pattern.typicalMagnitude.min}%+)`);
      } else if (insignificanceFactor > 2) {
        score = 0.5;
        reasons.push(`Magnitude below typical range for ${event.event_type}`);
      }
    }

    // Special cases for voltage events
    if (event.event_type === 'voltage_dip' && event.magnitude < 5) {
      score = 0.9;
      reasons.push('Voltage dip magnitude too small to affect equipment');
    }

    if (event.event_type === 'harmonic' && event.magnitude < 2) {
      score = 0.7;
      reasons.push('Harmonic distortion below IEEE 519 concern levels');
    }

    return { score, reasons };
  }

  private evaluateFrequencyPattern(event: any, context: DetectionContext): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Look for events within 1 hour window
    const eventTime = new Date(event.timestamp);
    const windowEvents = context.recentEvents.filter(e => {
      const timeDiff = Math.abs(eventTime.getTime() - new Date(e.timestamp).getTime());
      return timeDiff <= 3600000 && e.id !== event.id; // 1 hour window
    });

    // Check for suspicious frequency patterns
    if (windowEvents.length > 50) {
      score = 0.9;
      reasons.push(`Excessive event frequency: ${windowEvents.length} events in 1 hour`);
    } else if (windowEvents.length > 20) {
      score = 0.6;
      reasons.push('High event frequency may indicate measurement noise');
    }

    // Check for identical events (potential stuck meter)
    const identicalEvents = windowEvents.filter(e => 
      e.event_type === event.event_type &&
      Math.abs(e.magnitude - event.magnitude) < 0.1 &&
      Math.abs(e.duration_ms - event.duration_ms) < 50
    );

    if (identicalEvents.length > 5) {
      score = Math.max(score, 0.8);
      reasons.push('Multiple identical events suggest meter malfunction');
    }

    return { score, reasons };
  }

  private evaluateWaveformQuality(event: any, context: DetectionContext): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (!event.waveform_data || !event.waveform_data.voltage) {
      return { score: 0, reasons: [] };
    }

    const voltage = event.waveform_data.voltage;
    
    // Check for unrealistic voltage values
    const voltageValues = voltage.map((point: any) => point.value);
    const maxVoltage = Math.max(...voltageValues);
    const minVoltage = Math.min(...voltageValues);
    
    if (maxVoltage > 400 || minVoltage < 0) {
      score = 0.8;
      reasons.push('Waveform contains unrealistic voltage values');
    }

    // Check for measurement noise patterns
    const avgVoltage = voltageValues.reduce((sum: number, val: number) => sum + val, 0) / voltageValues.length;
    const variations = voltageValues.map((val: number) => Math.abs(val - avgVoltage));
    const avgVariation = variations.reduce((sum: number, val: number) => sum + val, 0) / variations.length;
    
    if (avgVariation > 50) {
      score = Math.max(score, 0.6);
      reasons.push('High waveform noise levels detected');
    }

    // Check for flat-line patterns (potential meter freeze)
    const uniqueValues = new Set(voltageValues.map((val: number) => Math.round(val * 10) / 10));
    if (uniqueValues.size < 5 && voltage.length > 50) {
      score = Math.max(score, 0.7);
      reasons.push('Waveform shows minimal variation (potential meter freeze)');
    }

    return { score, reasons };
  }

  private evaluateTemporalCorrelation(event: any, context: DetectionContext): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const eventTime = new Date(event.timestamp);
    
    // Check for events during maintenance windows
    const maintenanceWindow = context.maintenanceWindows.find(window => {
      const start = new Date(window.start);
      const end = new Date(window.end);
      return eventTime >= start && eventTime <= end;
    });

    if (maintenanceWindow) {
      score = 0.6;
      reasons.push('Event occurred during scheduled maintenance window');
    }

    // Check for isolated events (events that should correlate but don't)
    if (event.event_type === 'interruption') {
      // Interruptions should have related events
      const relatedEvents = context.recentEvents.filter(e => {
        const timeDiff = Math.abs(eventTime.getTime() - new Date(e.timestamp).getTime());
        return timeDiff <= 300000 && e.substation_id === event.substation_id; // 5 minutes
      });

      if (relatedEvents.length === 1) { // Only the event itself
        score = 0.5;
        reasons.push('Interruption event lacks expected related events');
      }
    }

    return { score, reasons };
  }

  private evaluateSystemState(event: any, context: DetectionContext): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Check system status
    if (context.systemStatus === 'maintenance') {
      score = 0.4;
      reasons.push('Event occurred during system maintenance');
    }

    // Check for weekend events (some event types less likely)
    const eventDate = new Date(event.timestamp);
    const dayOfWeek = eventDate.getDay();
    
    if ((dayOfWeek === 0 || dayOfWeek === 6) && 
        (event.event_type === 'harmonic' || event.event_type === 'voltage_dip')) {
      score = Math.max(score, 0.3);
      reasons.push('Event type uncommon during weekends (reduced industrial load)');
    }

    return { score, reasons };
  }

  private evaluatePhysicsConsistency(event: any, context: DetectionContext): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Check for physics violations
    if (event.event_type === 'voltage_dip' && event.magnitude > 100) {
      score = 0.9;
      reasons.push('Voltage dip magnitude cannot exceed 100%');
    }

    if (event.event_type === 'interruption' && event.magnitude < 50) {
      score = 0.7;
      reasons.push('Interruption should have magnitude near 100%');
    }

    // Check remaining voltage consistency for voltage dips
    if (event.event_type === 'voltage_dip' && event.remaining_voltage !== null) {
      const expectedRemaining = 100 - event.magnitude;
      if (Math.abs(event.remaining_voltage - expectedRemaining) > 10) {
        score = Math.max(score, 0.5);
        reasons.push('Remaining voltage inconsistent with dip magnitude');
      }
    }

    return { score, reasons };
  }

  // Machine learning prediction (simplified simulation)
  public predictFalsePositive(event: any, historicalData: any[]): number {
    // Simulate ML model prediction based on historical patterns
    const features = this.extractFeatures(event);
    const similarEvents = this.findSimilarEvents(event, historicalData);
    
    if (similarEvents.length === 0) {
      return 0.5; // Neutral confidence for unknown patterns
    }

    const falsePositiveRate = similarEvents.filter(e => e.is_false_positive).length / similarEvents.length;
    return falsePositiveRate;
  }

  private extractFeatures(event: any): number[] {
    // Extract numerical features for ML model
    return [
      event.duration_ms || 0,
      event.magnitude || 0,
      new Date(event.timestamp).getHours(),
      new Date(event.timestamp).getDay(),
      event.validated_by_adms ? 1 : 0,
      event.affected_phases.length,
      event.customer_count || 0
    ];
  }

  private findSimilarEvents(event: any, historicalData: any[]): any[] {
    // Find events with similar characteristics
    return historicalData.filter(historical => {
      return historical.event_type === event.event_type &&
             Math.abs(historical.duration_ms - event.duration_ms) < 1000 &&
             Math.abs(historical.magnitude - event.magnitude) < 10;
    });
  }

  // Rule-based filtering
  public applyConfiguredRules(events: any[], rules: any[]): any[] {
    return events.map(event => {
      const matchingRules = rules.filter(rule => {
        if (!rule.isActive) return false;
        return this.eventMatchesRule(event, rule);
      });

      return {
        ...event,
        falseEventRules: matchingRules,
        isFlaggedAsFalse: matchingRules.some(rule => rule.actions?.autoMark),
        shouldBeHidden: matchingRules.some(rule => rule.actions?.autoHide),
        requiresReview: matchingRules.some(rule => rule.actions?.requireReview)
      };
    });
  }

  private eventMatchesRule(event: any, rule: any): boolean {
    const conditions = rule.conditions || {};

    // Duration checks
    if (conditions.minDuration && event.duration_ms < conditions.minDuration) return false;
    if (conditions.maxDuration && event.duration_ms > conditions.maxDuration) return false;

    // Magnitude checks  
    if (conditions.minMagnitude && event.magnitude < conditions.minMagnitude) return false;
    if (conditions.maxMagnitude && event.magnitude > conditions.maxMagnitude) return false;

    // ADMS validation check
    if (conditions.requiresADMSValidation && !event.validated_by_adms) return false;

    // Event type restrictions
    if (conditions.allowedEventTypes && !conditions.allowedEventTypes.includes(event.event_type)) return false;
    if (conditions.excludedEventTypes && conditions.excludedEventTypes.includes(event.event_type)) return false;

    return true;
  }

  // Generate analytics for rule effectiveness
  public analyzeRulePerformance(events: any[], rules: any[]): any {
    const analytics = rules.map(rule => {
      const matchingEvents = events.filter(event => this.eventMatchesRule(event, rule));
      const actualFalsePositives = matchingEvents.filter(event => event.is_false_positive);
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        totalMatched: matchingEvents.length,
        truePositives: actualFalsePositives.length,
        falsePositives: matchingEvents.length - actualFalsePositives.length,
        accuracy: matchingEvents.length > 0 ? (actualFalsePositives.length / matchingEvents.length) * 100 : 0,
        efficiency: actualFalsePositives.length / Math.max(events.filter(e => e.is_false_positive).length, 1) * 100
      };
    });

    return analytics;
  }
}

// Export singleton instance
export const falseEventDetector = new FalseEventDetector();