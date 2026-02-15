"use client";
import { useMemo, useState } from "react";
import { Sale, TicketType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line,
    Legend,
    PieChart,
    Pie
} from "recharts";
import { TrendingUp, PieChart as PieIcon, LineChart as LineIcon, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SalesChartProps {
    sales: Sale[];
    ticketTypes: TicketType[];
    currency?: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function SalesChart({ sales, ticketTypes, currency = "FCFA" }: SalesChartProps) {
    const [activeTab, setActiveTab] = useState("evolution");

    // Process data for evolution chart (last 30 days)
    const salesEvolution = useMemo(() => {
        const dailySales: Record<string, { date: string; amount: number; quantity: number }> = {};

        // Map ticket prices
        const priceMap = new Map(ticketTypes.map(t => [t.name, t.price]));

        // Get last 30 days
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return d.toISOString().split('T')[0];
        });

        last30Days.forEach(date => {
            dailySales[date] = { date, amount: 0, quantity: 0 };
        });

        sales.forEach(sale => {
            if (dailySales[sale.date_de_prise]) {
                const price = priceMap.get(sale.ticket_type_name) || 0;
                dailySales[sale.date_de_prise].amount += sale.quantity * price;
                dailySales[sale.date_de_prise].quantity += sale.quantity;
            }
        });

        return Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date));
    }, [sales, ticketTypes]);

    // Process data for pie chart
    const salesByType = useMemo(() => {
        const counts: Record<string, number> = {};
        sales.forEach(sale => {
            counts[sale.ticket_type_name] = (counts[sale.ticket_type_name] || 0) + sale.quantity;
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [sales]);

    return (
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm h-full">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                            Analytiques de Performance
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Visualisez l'évolution de vos ventes et la répartition
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 h-11 p-1 bg-muted/50">
                        <TabsTrigger value="evolution" className="gap-2">
                            <LineIcon className="h-4 w-4" />
                            Évolution
                        </TabsTrigger>
                        <TabsTrigger value="distribution" className="gap-2">
                            <PieIcon className="h-4 w-4" />
                            Répartition
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="evolution" className="mt-0">
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesEvolution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(date) => {
                                            const d = new Date(date);
                                            return `${d.getDate()}/${d.getMonth() + 1}`;
                                        }}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(value) => `${value.toLocaleString()}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Legend iconType="circle" />
                                    <Line
                                        type="monotone"
                                        dataKey="amount"
                                        name={`Revenu (${currency})`}
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="quantity"
                                        name="Quantité"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>

                    <TabsContent value="distribution" className="mt-0">
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={salesByType}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {salesByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
