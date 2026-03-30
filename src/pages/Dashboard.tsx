import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { format, subMonths, parseISO, startOfMonth } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface Invoice {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  project_name: string;
  invoice_number: string;
  clients?: { name: string };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setInvoices(data as Invoice[]);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Aggregate Stats
  const totalEarned = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.total_amount), 0);
  const pendingAmount = invoices.filter(i => i.status === 'Sent' || i.status === 'Draft').reduce((sum, i) => sum + Number(i.total_amount), 0);
  const overdueAmount = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + Number(i.total_amount), 0);
  const totalInvoices = invoices.length;

  // Pie Chart Data
  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status]
  }));

  const COLORS = {
    'Paid': '#10b981',    // Emerald
    'Sent': '#3b82f6',    // Blue
    'Overdue': '#ef4444', // Red
    'Draft': '#6b7280'    // Gray
  };

  // Bar Chart Data (Last 6 Months Income)
  const barData = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthName = format(monthStart, 'MMM yyyy');
    
    // Sum only paid invoices created in that month
    const monthlyTotal = invoices
      .filter(inv => inv.status === 'Paid' && format(parseISO(inv.created_at), 'MMM yyyy') === monthName)
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    barData.push({
       name: format(monthStart, 'MMM'),
       Income: monthlyTotal
    });
  }

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your income and invoices.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Earned */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Earned</h3>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">${totalEarned.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
        </div>
        {/* Pending Amount */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Pending Balance</h3>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">${pendingAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
        </div>
        {/* Overdue Amount */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Overdue</h3>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">${overdueAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
        </div>
        {/* Total Invoices */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Invoices</h3>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6 text-foreground">Income Overview</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--muted))'}} 
                  contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))'}}
                  itemStyle={{color: 'hsl(var(--primary))'}}
                />
                <Bar dataKey="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6 text-foreground">Invoice Status</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS['Draft']} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px'}}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <p className="text-muted-foreground text-sm">No invoice data available.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground">Recent Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.slice(0, 5).map(inv => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    {inv.invoice_number}
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">{inv.project_name}</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{inv.clients?.name || 'Unknown'}</td>
                  <td className="px-6 py-4">
                     <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                        ${inv.status === 'Sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${inv.status === 'Overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                        ${inv.status === 'Draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' : ''}
                     `}>
                        {inv.status}
                     </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-right">${Number(inv.total_amount).toFixed(2)}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                   <td colSpan={4} className="text-center py-8 text-muted-foreground">No recent invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
