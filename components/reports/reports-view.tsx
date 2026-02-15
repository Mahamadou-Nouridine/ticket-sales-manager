"use client";

import { useState, useMemo } from "react";
import { Sale, TicketType, User as UserType, TicketInventory } from "@/lib/types";
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
    LineChart,
    Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

interface ReportsViewProps {
    sales: Sale[];
    ticketTypes: TicketType[];
    resellers: UserType[];
    inventory?: TicketInventory[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function ReportsView({ sales, ticketTypes, resellers, inventory }: ReportsViewProps) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedReseller, setSelectedReseller] = useState("all");
    const [selectedTicketType, setSelectedTicketType] = useState("all");

    // Filter sales based on parameters
    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            // Date filter
            if (startDate && sale.date_de_prise < startDate) return false;
            if (endDate && sale.date_de_prise > endDate) return false;

            // Reseller filter
            if (selectedReseller !== "all" && (sale as any).seller_name !== selectedReseller) return false;

            // Ticket type filter
            if (selectedTicketType !== "all" && sale.ticket_type_name !== selectedTicketType) return false;

            return true;
        });
    }, [sales, startDate, endDate, selectedReseller, selectedTicketType]);

    // Generate price map for efficiency
    const priceMap = useMemo(() => new Map(ticketTypes.map(t => [t.name, t.price])), [ticketTypes]);

    // Calculate detailed revenue
    const { paidRevenue, unpaidRevenue } = useMemo(() => {
        return filteredSales.reduce((acc, sale) => {
            const price = priceMap.get(sale.ticket_type_name) || 0;
            const revenue = price * sale.quantity;
            if (sale.verse) {
                acc.paidRevenue += revenue;
            } else {
                acc.unpaidRevenue += revenue;
            }
            return acc;
        }, { paidRevenue: 0, unpaidRevenue: 0 });
    }, [filteredSales, priceMap]);

    const totalRevenue = paidRevenue + unpaidRevenue;

    // Calculate average sale value
    const averageSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

    const salesByReseller = filteredSales.reduce((acc, sale) => {
        const price = priceMap.get(sale.ticket_type_name) || 0;
        const revenue = price * sale.quantity;
        const sellerName = (sale as any).seller_name || "Inconnu";

        if (!acc[sellerName]) {
            acc[sellerName] = { quantity: 0, paidRevenue: 0, unpaidRevenue: 0, revenue: 0 };
        }
        acc[sellerName].quantity += sale.quantity;
        acc[sellerName].revenue += revenue;
        if (sale.verse) {
            acc[sellerName].paidRevenue += revenue;
        } else {
            acc[sellerName].unpaidRevenue += revenue;
        }
        return acc;
    }, {} as Record<string, { quantity: number; paidRevenue: number; unpaidRevenue: number; revenue: number }>);

    const barData = Object.entries(salesByReseller).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
        paid: data.paidRevenue,
        unpaid: data.unpaidRevenue,
    })).sort((a, b) => b.revenue - a.revenue);

    // Top salesman
    const topReseller = barData.length > 0 ? barData[0] : null;

    // Aggregate sales by ticket type
    const salesByType = filteredSales.reduce((acc, sale) => {
        acc[sale.ticket_type_name] = (acc[sale.ticket_type_name] || 0) + sale.quantity;
        return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(salesByType).map(([name, value]) => ({
        name,
        value,
    })).sort((a, b) => b.value - a.value);

    // Top ticket type
    const topTicketType = pieData.length > 0 ? pieData[0] : null;

    const salesEvolution = useMemo(() => {
        const dailySales = filteredSales.reduce((acc, sale) => {
            const date = sale.date_de_prise;
            const price = priceMap.get(sale.ticket_type_name) || 0;
            const revenue = price * sale.quantity;

            if (!acc[date]) {
                acc[date] = { date, quantity: 0, paid: 0, unpaid: 0, total: 0 };
            }
            acc[date].quantity += sale.quantity;
            acc[date].total += revenue;
            if (sale.verse) {
                acc[date].paid += revenue;
            } else {
                acc[date].unpaid += revenue;
            }
            return acc;
        }, {} as Record<string, { date: string; quantity: number; paid: number; unpaid: number; total: number }>);

        return Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredSales, priceMap]);

    // Inventory data for chart
    const inventoryData = inventory?.map(item => ({
        name: item.ticket_type_name,
        stock: item.current_stock,
        threshold: item.alert_threshold,
        isLow: item.current_stock <= item.alert_threshold,
    })) || [];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtres</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date Début</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date Fin</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Vendeur</label>
                            <Select value={selectedReseller} onValueChange={setSelectedReseller}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    {resellers.map((r) => (
                                        <SelectItem key={r.id} value={[r.first_name, r.last_name].filter(Boolean).join(' ') || r.full_name || r.username || r.email}>
                                            {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.full_name || r.username || r.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type de Ticket</label>
                            <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    {ticketTypes.filter(t => t.active).map(t => (
                                        <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                            Chiffre d'Affaires Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} FCFA</div>
                        <p className="text-xs text-muted-foreground">{filteredSales.length} vente(s)</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                            Revenu Validé
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{paidRevenue.toLocaleString()} FCFA</div>
                        <p className="text-xs text-muted-foreground">Paiements approuvés</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                            Reste à Encaisser
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{unpaidRevenue.toLocaleString()} FCFA</div>
                        <p className="text-xs text-muted-foreground text-orange-700/70 font-medium">Dû par les vendeurs</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                            Vente Moyenne
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(averageSale).toLocaleString()} FCFA</div>
                        <p className="text-xs text-muted-foreground">Par transaction</p>
                    </CardContent>
                </Card>
            </div>

            {/* Evolution Chart */}
            {salesEvolution.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Évolution des Ventes</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesEvolution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="paid" stroke="#10b981" name="Validé (FCFA)" strokeWidth={2} />
                                <Line yAxisId="left" type="monotone" dataKey="unpaid" stroke="#f97316" name="Dû (FCFA)" strokeWidth={2} />
                                <Line yAxisId="right" type="monotone" dataKey="quantity" stroke="#3b82f6" name="Quantité" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Performance par Vendeur</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="paid" stackId="a" fill="#10b981" name="Validé (FCFA)" />
                                <Bar dataKey="unpaid" stackId="a" fill="#f97316" name="Dû (FCFA)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
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

            {/* Inventory Status */}
            {inventory && inventory.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>État de l'Inventaire</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={inventoryData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="stock" fill="#00C49F" name="Stock Actuel" />
                                <Bar dataKey="threshold" fill="#FF8042" name="Seuil d'Alerte" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Low Stock Alerts */}
            {inventory && inventory.some(i => i.current_stock <= i.alert_threshold) && (
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="h-5 w-5" />
                            Alertes de Stock Faible
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {inventory
                                .filter(i => i.current_stock <= i.alert_threshold)
                                .map(item => (
                                    <div key={item.id} className="flex justify-between items-center">
                                        <span className="font-medium">{item.ticket_type_name}</span>
                                        <span className="text-red-600 font-semibold">
                                            {item.current_stock} / {item.alert_threshold}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
