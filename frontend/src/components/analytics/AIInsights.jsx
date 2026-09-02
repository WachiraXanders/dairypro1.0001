import React, { useState } from 'react';
import { integrations } from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AIInsights({ cattle, milkRecords, healthRecords, breedingRecords }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const analyzeData = async () => {
    setIsAnalyzing(true);
    
    try {
      // Prepare data for analysis
      const cattleSummary = cattle.map(c => ({
        tag: c.tag_number,
        name: c.name,
        breed: c.breed,
        status: c.status,
        lactation: c.lactation_number,
      }));

      // Calculate per-cattle milk production
      const milkByCattle = {};
      milkRecords.forEach(r => {
        if (!milkByCattle[r.cattle_tag]) {
          milkByCattle[r.cattle_tag] = { total: 0, count: 0, recent: [] };
        }
        milkByCattle[r.cattle_tag].total += r.quantity_liters || 0;
        milkByCattle[r.cattle_tag].count += 1;
        milkByCattle[r.cattle_tag].recent.push({
          date: r.date,
          liters: r.quantity_liters,
        });
      });

      // Calculate per-cattle health events
      const healthByCattle = {};
      healthRecords.forEach(r => {
        if (!healthByCattle[r.cattle_tag]) {
          healthByCattle[r.cattle_tag] = [];
        }
        healthByCattle[r.cattle_tag].push({
          date: r.date,
          type: r.record_type,
          diagnosis: r.diagnosis,
        });
      });

      // Prepare analysis prompt
      const prompt = `You are an expert dairy farm management consultant. Analyze this farm data and provide actionable insights:

CATTLE: ${cattleSummary.length} animals
${JSON.stringify(cattleSummary.slice(0, 20), null, 2)}

MILK PRODUCTION (last 100 records):
${JSON.stringify(Object.entries(milkByCattle).slice(0, 10).map(([tag, data]) => ({
  tag,
  totalLiters: data.total.toFixed(1),
  avgPerSession: (data.total / data.count).toFixed(1),
  sessions: data.count
})), null, 2)}

HEALTH EVENTS (last 50):
${JSON.stringify(Object.entries(healthByCattle).slice(0, 10).map(([tag, events]) => ({
  tag,
  eventCount: events.length,
  types: events.map(e => e.type)
})), null, 2)}

Please analyze and provide:
1. Low milk yield alerts - identify cattle with below-average production
2. Recurring health issues - identify cattle with repeated health problems
3. Actionable recommendations for farm management

Format your response clearly with specific cattle tags and metrics.`;

      const response = await integrations.invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            low_yield_cattle: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tag: { type: "string" },
                  average_liters: { type: "number" },
                  issue: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            recurring_health_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tag: { type: "string" },
                  issue_type: { type: "string" },
                  frequency: { type: "number" },
                  recommendation: { type: "string" }
                }
              }
            },
            general_recommendations: {
              type: "array",
              items: { type: "string" }
            },
            overall_health_score: { type: "string" }
          }
        }
      });

      if (response?._ai_unavailable) {
        toast.error(response.message || 'AI analysis is not configured on the backend.');
      } else {
        setInsights(response);
        toast.success('Analysis complete!');
      }
    } catch (error) {
      toast.error('Failed to analyze data');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI-Powered Insights</h2>
          <p className="text-sm text-muted-foreground mt-1">Automatically detect issues and get recommendations</p>
        </div>
        <Button onClick={analyzeData} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-700">
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Run AI Analysis
            </>
          )}
        </Button>
      </div>

      {!insights ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground/70 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Click "Run AI Analysis" to get intelligent insights about your farm's performance,
              identify low-yield cattle, and detect recurring health issues.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overall Health Score */}
          {insights.overall_health_score && (
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Farm Health Score:</strong> {insights.overall_health_score}
              </AlertDescription>
            </Alert>
          )}

          {/* Low Yield Alerts */}
          {insights.low_yield_cattle && insights.low_yield_cattle.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  Low Milk Yield Alerts ({insights.low_yield_cattle.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.low_yield_cattle.map((cattle, idx) => (
                    <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">{cattle.tag}</Badge>
                          <Badge className="bg-orange-100 text-orange-700">
                            {cattle.average_liters?.toFixed(1)}L avg
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-orange-800 mb-2"><strong>Issue:</strong> {cattle.issue}</p>
                      <p className="text-sm text-orange-700">{cattle.recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recurring Health Issues */}
          {insights.recurring_health_issues && insights.recurring_health_issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  Recurring Health Issues ({insights.recurring_health_issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.recurring_health_issues.map((issue, idx) => (
                    <div key={idx} className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">{issue.tag}</Badge>
                          <Badge className="bg-rose-100 text-rose-700">{issue.issue_type}</Badge>
                        </div>
                        <span className="text-sm text-rose-700">
                          {issue.frequency} {issue.frequency === 1 ? 'event' : 'events'}
                        </span>
                      </div>
                      <p className="text-sm text-rose-700">{issue.recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* General Recommendations */}
          {insights.general_recommendations && insights.general_recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  General Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.general_recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-semibold text-emerald-700">{idx + 1}</span>
                      </div>
                      <p className="text-sm text-emerald-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
