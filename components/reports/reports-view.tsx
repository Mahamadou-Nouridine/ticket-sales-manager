"use client";

import { Sale, TicketType } from "@/lib/types";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportsViewProps {
    sales: Sale[];
    ticketTypes: TicketType[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function ReportsView({ sales, ticketTypes }: ReportsViewProps) {
    // Aggregate sales by salesman
    const salesBySalesman = sales.reduce((acc, sale) => {
        acc[sale.salesman_name] = (acc[sale.salesman_name] || 0) + sale.quantity;
        return acc;
    }, {} as Record<string, number>);

    const barData = Object.entries(salesBySalesman).map(([name, quantity]) => ({
        name,
        quantity,
    }));

    // Aggregate sales by ticket type
    const salesByType = sales.reduce((acc, sale) => {
        acc[sale.ticket_type_name] = (acc[sale.ticket_type_name] || 0) + sale.quantity;
        return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(salesByType).map(([name, value]) => ({
        name,
        value,
    }));

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Ventes par Vendeur</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="quantity" fill="#8884d8" name="Quantité" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Répartition par Type de Ticket</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
