import React, { useState, useMemo } from 'react';
import { integrations } from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

export default function MilkTrendForecast({ cattle, milkRecords }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecast, setForecast] = useState(null);

  const historicalData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
      const monthRecords = milkRecords.filter(r => r.date >= monthStart && r.date <= monthEnd);
      const total = monthRecords.reduce((sum, r) => sum + (r.quantity_liters || 0), 0);

      return {
        month: format(month, 'MMM yy'),
        actual: total,
      };
    });
  }, [milkRecords]);

  const generateForecast = async () => {
    setIsAnalyzing(true);

    try {
      const prompt = `You are a dairy farm analytics expert. Analyze this milk production data and provide a 3-month forecast:

HISTORICAL DATA (last 12 months):
${JSON.stringify(historicalData, null, 2)}

CATTLE INFORMATION:
- Total cattle: ${cattle.length}
- Active milking cattle: ${cattle.filter(c => c.status === 'Active' || c.status === 'Pregnant').length}
- Dry cattle: ${cattle.filter(c => c.status === 'Dry').length}

Based on this data, provide:
1. Forecasted milk production for the next 3 months
2. Expected trend (increasing/decreasing/stable)
3. Factors affecting the forecast
4. Actionable recommendations to optimize production

Consider seasonal patterns, cattle lifecycle, and historical trends.`;

      const response = await integrations.invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            forecast: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  month: { type: "string" },
                  predicted_liters: { type: "number" },
                  confidence: { type: "string" }
                }
              }
            },
            trend: { type: "string" },
            trend_percentage: { type: "number" },
            factors: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (response?._ai_unavailable) {
        toast.error(response.message || 'AI forecast is not configured on the backend.');
      } else {
        setForecast(response);
        toast.success('Forecast generated successfully');
      }
    } catch (error) {
      toast.error('Failed to generate forecast');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = useMemo(() => {
    if (!forecast) return historicalData;

    return [
      ...historicalData,
      ...forecast.forecast.map(f => ({
        month: f.month,
        forecast: f.predicted_liters,
      }))
    ];
  }, [historicalData, forecast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Milk Production Forecast</h2>
          <p className="text-sm text-muted-foreground mt-1">AI-powered 3-month production predictions</p>
        </div>
        <Button onClick={generateForecast} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-700">
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Forecast
            </>
          )}
        </Button>
      </div>

      {!forecast ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="w-12 h-12 text-muted-foreground/70 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Forecast Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Click "Generate Forecast" to analyze historical data and predict future milk production trends.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Alerts */}
          {forecast.alerts && forecast.alerts.length > 0 && (
            <div className="space-y-2">
              {forecast.alerts.map((alert, idx) => (
                <Alert key={idx} className="bg-amber-50 border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>{alert.type}:</strong> {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Trend Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {forecast.trend_percentage >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                )}
                Forecast Trend: {forecast.trend}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge className={forecast.trend_percentage >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                  {forecast.trend_percentage > 0 ? '+' : ''}{forecast.trend_percentage}% expected change
                </Badge>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-foreground/90">Key Factors:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {forecast.factors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Production Trend & Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value) => `${value.toFixed(0)}L`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} name="Actual Production" />
                    <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Forecasted" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Forecasted Values */}
          <Card>
            <CardHeader>
              <CardTitle>Next 3 Months Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.forecast.map((month, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <span className="font-semibold text-purple-900">{month.month}</span>
                      <p className="text-xs text-purple-700">Confidence: {month.confidence}</p>
                    </div>
                    <span className="text-xl font-bold text-purple-600">
                      {month.predicted_liters.toLocaleString()}L
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.recommendations.map((rec, idx) => (
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
        </div>
      )}
    </div>
  );
}
