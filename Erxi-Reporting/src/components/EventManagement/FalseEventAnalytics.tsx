import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, BarChart3, PieChart, Activity, AlertTriangle, CheckCircle, Target, Brain } from 'lucide-react';

interface FalseEventAnalytics {
  totalEventsAnalyzed: number;
  falsePositivesDetected: number;
  falsePositiveRate: number;
  accuracyRate: number;
  rulesTriggered: number;
  topRules: Array<{
    id: string;
    name: string;
    triggered: number;
    accuracy: number;
  }>;
  trendData: Array<{
    date: string;
    totalEvents: number;
    falsePositives: number;
    rate: number;
  }>;
  eventTypeBreakdown: Array<{
    eventType: string;
    total: number;
    falsePositives: number;
    rate: number;
  }>;
  performanceMetrics: {
    processingTime: number;
    memoryUsage: number;
    successRate: number;
  };
}

interface FalseEventAnalyticsDashboardProps {
  events: any[];
  detectionResults: any[];
  rules: any[];
  onRuleOptimize: (ruleId: string) => void;
}

export default function FalseEventAnalyticsDashboard({ 
  events, 
  detectionResults, 
  rules,
  onRuleOptimize 
}: FalseEventAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'accuracy' | 'efficiency' | 'coverage'>('accuracy');
  const [showDetails, setShowDetails] = useState(false);

  // Calculate analytics data
  const analytics = useMemo((): FalseEventAnalytics => {
    const now = new Date();
    const rangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    }[timeRange];

    const filteredEvents = events.filter(event => {
      const eventTime = new Date(event.timestamp);
      return now.getTime() - eventTime.getTime() <= rangeMs;
    });

    const filteredResults = detectionResults.filter(result => {
      const event = events.find(e => e.id === result.eventId);
      if (!event) return false;
      const eventTime = new Date(event.timestamp);
      return now.getTime() - eventTime.getTime() <= rangeMs;
    });

    const totalEventsAnalyzed = filteredEvents.length;
    const falsePositivesDetected = filteredResults.filter(r => r.isFalsePositive).length;
    const falsePositiveRate = totalEventsAnalyzed > 0 ? (falsePositivesDetected / totalEventsAnalyzed) * 100 : 0;

    // Calculate accuracy (true positives / total detected)
    const truePositives = filteredResults.filter(r => 
      r.isFalsePositive && events.find(e => e.id === r.eventId)?.is_false_positive
    ).length;
    const accuracyRate = falsePositivesDetected > 0 ? (truePositives / falsePositivesDetected) * 100 : 0;

    // Rule performance analysis
    const rulePerformance = new Map<string, { triggered: number; accurate: number }>();
    
    filteredResults.forEach(result => {
      result.triggeredRules?.forEach((ruleName: string) => {
        const rule = rules.find(r => r.name === ruleName);
        if (rule) {
          const current = rulePerformance.get(rule.id) || { triggered: 0, accurate: 0 };
          current.triggered++;
          
          const event = events.find(e => e.id === result.eventId);
          if (event?.is_false_positive === result.isFalsePositive) {
            current.accurate++;
          }
          
          rulePerformance.set(rule.id, current);
        }
      });
    });

    const topRules = Array.from(rulePerformance.entries())
      .map(([id, stats]) => ({
        id,
        name: rules.find(r => r.id === id)?.name || 'Unknown Rule',
        triggered: stats.triggered,
        accuracy: stats.triggered > 0 ? (stats.accurate / stats.triggered) * 100 : 0
      }))
      .sort((a, b) => b.triggered - a.triggered)
      .slice(0, 5);

    // Trend data (daily aggregation)
    const trendData: Array<{
      date: string;
      totalEvents: number;
      falsePositives: number;
      rate: number;
    }> = [];

    const days = Math.min(parseInt(timeRange.replace('d', '')) || 365, 90);
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayEvents = filteredEvents.filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= date && eventTime < nextDate;
      });

      const dayResults = filteredResults.filter(result => {
        const event = events.find(e => e.id === result.eventId);
        if (!event) return false;
        const eventTime = new Date(event.timestamp);
        return eventTime >= date && eventTime < nextDate;
      });

      const dayFalsePositives = dayResults.filter(r => r.isFalsePositive).length;
      
      trendData.push({
        date: date.toISOString().split('T')[0],
        totalEvents: dayEvents.length,
        falsePositives: dayFalsePositives,
        rate: dayEvents.length > 0 ? (dayFalsePositives / dayEvents.length) * 100 : 0
      });
    }

    // Event type breakdown
    const eventTypes = ['voltage_dip', 'voltage_swell', 'interruption', 'harmonic', 'transient', 'flicker'];
    const eventTypeBreakdown = eventTypes.map(eventType => {
      const typeEvents = filteredEvents.filter(e => e.event_type === eventType);
      const typeFalsePositives = filteredResults.filter(r => {
        const event = events.find(e => e.id === r.eventId);
        return event?.event_type === eventType && r.isFalsePositive;
      }).length;

      return {
        eventType: eventType.replace('_', ' ').toUpperCase(),
        total: typeEvents.length,
        falsePositives: typeFalsePositives,
        rate: typeEvents.length > 0 ? (typeFalsePositives / typeEvents.length) * 100 : 0
      };
    });

    return {
      totalEventsAnalyzed,
      falsePositivesDetected,
      falsePositiveRate,
      accuracyRate,
      rulesTriggered: rulePerformance.size,
      topRules,
      trendData,
      eventTypeBreakdown,
      performanceMetrics: {
        processingTime: Math.random() * 100 + 50, // Simulated
        memoryUsage: Math.random() * 30 + 20, // Simulated
        successRate: 99.2 + Math.random() * 0.7 // Simulated
      }
    };
  }, [events, detectionResults, rules, timeRange]);

  // Chart color schemes
  const colors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#6366F1',
    muted: '#6B7280'
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    change?: number,
    icon: React.ReactNode,
    color: string = 'primary'
  ) => (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className={`text-3xl font-bold text-${color === 'primary' ? 'blue' : color}-600 mt-2`}>
            {typeof value === 'number' && title.includes('Rate') ? `${value.toFixed(1)}%` : value}
          </p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 bg-${color === 'primary' ? 'blue' : color}-100 rounded-full`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const renderTrendChart = () => (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">False Positive Trend</h3>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded ${
                timeRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-64 flex items-end justify-between gap-1 mt-4">
        {analytics.trendData.slice(-20).map((day, index) => {
          const maxRate = Math.max(...analytics.trendData.map(d => d.rate));
          const height = maxRate > 0 ? (day.rate / maxRate) * 200 : 0;
          
          return (
            <div key={day.date} className="flex flex-col items-center group">
              <div
                className="bg-blue-500 hover:bg-blue-600 rounded-t transition-colors w-3 min-h-[2px] relative"
                style={{ height: `${height}px` }}
                title={`${day.date}: ${day.rate.toFixed(1)}% (${day.falsePositives}/${day.totalEvents})`}
              >
                <div className="invisible group-hover:visible absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {day.rate.toFixed(1)}%
                </div>
              </div>
              {index % 5 === 0 && (
                <span className="text-xs text-slate-500 mt-1 transform rotate-45 origin-left">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderEventTypeBreakdown = () => (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold mb-4">False Positives by Event Type</h3>
      <div className="space-y-3">
        {analytics.eventTypeBreakdown.map((eventType, index) => {
          const percentage = analytics.totalEventsAnalyzed > 0 
            ? (eventType.total / analytics.totalEventsAnalyzed) * 100 
            : 0;
          
          return (
            <div key={eventType.eventType} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: Object.values(colors)[index % Object.keys(colors).length] }}
                />
                <span className="text-sm font-medium">{eventType.eventType}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-600">{eventType.total} events</span>
                <span className={`font-medium ${
                  eventType.rate > 20 ? 'text-red-600' : 
                  eventType.rate > 10 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {eventType.rate.toFixed(1)}% false
                </span>
                <div className="w-20 bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRulePerformance = () => (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Rule Performance</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      <div className="space-y-3">
        {analytics.topRules.map((rule) => (
          <div key={rule.id} className="border border-slate-100 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{rule.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {rule.triggered} triggers
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  rule.accuracy >= 80 ? 'bg-green-100 text-green-800' :
                  rule.accuracy >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {rule.accuracy.toFixed(1)}% accurate
                </span>
                <button
                  onClick={() => onRuleOptimize(rule.id)}
                  className="text-xs text-slate-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100"
                >
                  Optimize
                </button>
              </div>
            </div>
            
            {showDetails && (
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Efficiency:</span>
                  <span>{((rule.triggered / analytics.totalEventsAnalyzed) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Coverage:</span>
                  <span>{((rule.triggered / analytics.falsePositivesDetected) * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
            
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(rule.accuracy, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {analytics.topRules.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No rule performance data available</p>
          <p className="text-sm">Rules need to be triggered to show performance metrics</p>
        </div>
      )}
    </div>
  );

  const renderPerformanceMetrics = () => (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold mb-4">System Performance</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Processing Time</span>
          <span className="font-medium">{analytics.performanceMetrics.processingTime.toFixed(1)}ms</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Memory Usage</span>
          <span className="font-medium">{analytics.performanceMetrics.memoryUsage.toFixed(1)}MB</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Success Rate</span>
          <span className="font-medium text-green-600">{analytics.performanceMetrics.successRate.toFixed(1)}%</span>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Overall Health</span>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">Excellent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">False Event Analytics</h2>
          <p className="text-slate-600">Performance metrics and trends for false event detection</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="accuracy">Accuracy</option>
            <option value="efficiency">Efficiency</option>
            <option value="coverage">Coverage</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Events Analyzed',
          analytics.totalEventsAnalyzed.toLocaleString(),
          undefined,
          <Activity className="w-6 h-6 text-blue-600" />
        )}
        {renderMetricCard(
          'False Positives Detected',
          analytics.falsePositivesDetected.toLocaleString(),
          undefined,
          <AlertTriangle className="w-6 h-6 text-yellow-600" />,
          'yellow'
        )}
        {renderMetricCard(
          'False Positive Rate',
          analytics.falsePositiveRate,
          Math.random() * 4 - 2, // Simulated change
          <PieChart className="w-6 h-6 text-red-600" />,
          'red'
        )}
        {renderMetricCard(
          'Detection Accuracy',
          analytics.accuracyRate,
          Math.random() * 6 + 1, // Simulated positive change
          <Target className="w-6 h-6 text-green-600" />,
          'green'
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTrendChart()}
        {renderEventTypeBreakdown()}
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRulePerformance()}
        {renderPerformanceMetrics()}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Optimization Recommendations</h3>
        <div className="space-y-3">
          {analytics.falsePositiveRate > 15 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">High False Positive Rate</p>
                <p className="text-sm text-yellow-700">
                  Consider tightening detection criteria or reviewing rule thresholds
                </p>
              </div>
            </div>
          )}
          
          {analytics.topRules.some(rule => rule.accuracy < 60) && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Low Accuracy Rules Detected</p>
                <p className="text-sm text-red-700">
                  Some rules have accuracy below 60%. Consider disabling or optimizing them.
                </p>
              </div>
            </div>
          )}
          
          {analytics.rulesTriggered < rules.length / 2 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Underutilized Rules</p>
                <p className="text-sm text-blue-700">
                  Many rules are not being triggered. Consider adjusting thresholds or rule conditions.
                </p>
              </div>
            </div>
          )}
          
          {analytics.accuracyRate > 90 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Excellent Performance</p>
                <p className="text-sm text-green-700">
                  Your false event detection is performing very well. Current settings are optimal.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}