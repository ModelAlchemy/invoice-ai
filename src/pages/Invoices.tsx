import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Trash2, Download, Send, CheckCircle, Clock, Search, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format, isPast, parseISO } from 'date-fns';

interface Client {
  id: string;
  name: string;
  email: string | null;
}

interface LineItem {
  id: string;
  description: string;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  project_name: string;
  client_id: string;
  line_items: LineItem[];
  total_amount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  due_date: string | null;
  notes: string | null;
  created_at: string;
  clients?: { name: string; email: string };
}

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<{
    id: string;
    client_id: string;
    project_name: string;
    due_date: string;
    notes: string;
    line_items: LineItem[];
  }>({
    id: '', client_id: '', project_name: '', due_date: '', notes: '', line_items: [{ id: Date.now().toString(), description: '', amount: 0 }]
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [{ data: invoiceData, error: iError }, { data: clientData, error: cError }] = await Promise.all([
        supabase.from('invoices').select('*, clients(name, email)').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, email')
      ]);

      if (iError) throw iError;
      if (cError) throw cError;

      // Auto-flag overdue invoices
      let updatedInvoices = [...(invoiceData || [])] as Invoice[];
      const today = new Date();
      updatedInvoices = updatedInvoices.map(inv => {
        if (inv.status !== 'Paid' && inv.due_date && isPast(parseISO(inv.due_date)) && format(parseISO(inv.due_date), 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) {
          if (inv.status !== 'Overdue') {
             // Update database asynchronously
             supabase.from('invoices').update({ status: 'Overdue' }).eq('id', inv.id).then();
          }
          return { ...inv, status: 'Overdue' as const };
        }
        return inv;
      });

      setInvoices(updatedInvoices);
      setClients(clientData || []);
    } catch (error: any) {
      toast.error('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAI = async () => {
    if (!formData.project_name) {
      toast.error('Please enter a project name first.');
      return;
    }
    const toastId = toast.loading('Generating line items with AI...');
    // Simulated AI response
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        notes: `Thank you for choosing InvoiceAI for your project: ${prev.project_name}. We appreciate your business.`,
        line_items: [
          { id: Date.now().toString(), description: 'Phase 1: Project Setup & Consultation', amount: 500 },
          { id: (Date.now() + 1).toString(), description: `Implementation of ${prev.project_name}`, amount: 1200 },
          { id: (Date.now() + 2).toString(), description: 'Testing & QA', amount: 300 }
        ]
      }));
      toast.success('Successfully generated!', { id: toastId });
    }, 1500);
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = invoices.length + 1;
    return `INV-${year}-${count.toString().padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const total_amount = formData.line_items.reduce((sum, item) => sum + Number(item.amount), 0);

    try {
      if (formData.id) {
        const { error } = await supabase.from('invoices').update({
          client_id: formData.client_id,
          project_name: formData.project_name,
          due_date: formData.due_date || null,
          notes: formData.notes,
          line_items: formData.line_items,
          total_amount
        }).eq('id', formData.id);
        
        if (error) throw error;
        toast.success('Invoice updated successfully');
      } else {
        const invoice_number = generateInvoiceNumber();
        const { error } = await supabase.from('invoices').insert([{
          user_id: user.id,
          client_id: formData.client_id,
          invoice_number,
          project_name: formData.project_name,
          due_date: formData.due_date || null,
          notes: formData.notes,
          line_items: formData.line_items,
          total_amount,
          status: 'Draft'
        }]);
        
        if (error) throw error;
        toast.success('Invoice created successfully');
      }
      
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      toast.error('Failed to save invoice: ' + error.message);
    }
  };

  const updateStatus = async (id: string, status: 'Draft' | 'Sent' | 'Paid' | 'Overdue') => {
    try {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
      if (error) throw error;
      
      if (status === 'Paid') {
        const inv = invoices.find(i => i.id === id);
        if (inv) {
          await supabase.from('payments').insert([{ invoice_id: id, amount_paid: inv.total_amount }]);
        }
      }
      toast.success(`Invoice marked as ${status}`);
      fetchData();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      toast.success('Invoice deleted');
      fetchData();
    } catch (e: any) {
      toast.error('Failed to delete: ' + e.message);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoicePreviewRef.current) return;
    const toastId = toast.loading('Generating PDF...');
    try {
      const canvas = await html2canvas(invoicePreviewRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${formData.project_name}.pdf`);
      toast.success('PDF Downloaded!', { id: toastId });
    } catch (error) {
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
                          inv.project_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Paid</span>;
      case 'Sent': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Sent</span>;
      case 'Overdue': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Overdue</span>;
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Draft</span>;
    }
  };

  if (loading) return <div className="animate-pulse">Loading invoices...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-2">Create, manage, and send professional invoices.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              id: '', client_id: '', project_name: '', due_date: '', notes: '', line_items: [{ id: Date.now().toString(), description: '', amount: 0 }]
            });
            setShowForm(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {showForm ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Form Side */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{formData.id ? 'Edit Invoice' : 'New Invoice'}</h2>
              <button 
                type="button"
                onClick={handleAI} 
                className="text-sm bg-accent/10 text-accent hover:bg-accent/20 px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-colors border border-accent/20"
              >
                <Sparkles className="w-4 h-4" /> Generate with AI
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Project Name *</label>
                  <input required value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary" placeholder="e.g. E-commerce Website Rebuild"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Client *</label>
                  <select required value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                    <option value="">Select a client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Line Items</label>
                  <button type="button" onClick={() => setFormData({...formData, line_items: [...formData.line_items, { id: Date.now().toString(), description: '', amount: 0 }]})} className="text-primary text-sm hover:underline font-medium">Add Item</button>
                </div>
                <div className="space-y-3">
                  {formData.line_items.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <input 
                        required 
                        placeholder="Description" 
                        value={item.description} 
                        onChange={e => {
                           const updated = [...formData.line_items];
                           updated[idx].description = e.target.value;
                           setFormData({...formData, line_items: updated});
                        }} 
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm" 
                      />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <input 
                          type="number" 
                          required 
                          placeholder="0.00" 
                          value={item.amount || ''} 
                          onChange={e => {
                             const updated = [...formData.line_items];
                             updated[idx].amount = Number(e.target.value);
                             setFormData({...formData, line_items: updated});
                          }} 
                          className="w-full pl-7 pr-3 py-2 border rounded-md bg-background text-sm" 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (formData.line_items.length > 1) {
                            setFormData({...formData, line_items: formData.line_items.filter((_, i) => i !== idx)});
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Footer Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border rounded-md bg-background text-sm" placeholder="Additional details or payment terms..." />
              </div>

              <div className="flex justify-between items-center border-t border-border pt-4 mt-6">
                <span className="text-lg font-semibold">Total: ${formData.line_items.reduce((s, i) => s + Number(i.amount), 0).toFixed(2)}</span>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-foreground bg-muted hover:bg-muted/80 rounded-md text-sm font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium">Save Invoice</button>
                </div>
              </div>
            </form>
          </div>

          {/* Preview Side */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 sm:p-8 flex items-center justify-center flex-col shadow-inner overflow-hidden">
            <div className="flex w-full justify-between items-center mb-4 text-sm font-medium">
              <span className="text-muted-foreground">Live Preview</span>
              <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            
            <div ref={invoicePreviewRef} className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-10 shadow-lg scale-[0.6] sm:scale-75 xl:scale-95 origin-top border relative">
              <div className="flex justify-between items-start mb-12 border-b-2 border-gray-100 pb-8">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-4">
                    <FileText className="w-8 h-8" />
                    <span className="text-2xl font-bold tracking-tight">InvoiceAI</span>
                  </div>
                  <h1 className="text-4xl font-bold text-gray-800 tracking-tight">INVOICE</h1>
                  <p className="text-gray-500 mt-2 font-medium">{generateInvoiceNumber()}</p>
                </div>
                <div className="text-right text-sm text-gray-600 mt-4">
                  <p className="font-semibold text-gray-800 mb-1">From:</p>
                  <p>{user?.email}</p>
                </div>
              </div>

              <div className="flex justify-between mb-12 text-sm">
                <div>
                  <p className="font-semibold text-gray-800 mb-2">Billed To:</p>
                  <p className="text-gray-600">{clients.find(c => c.id === formData.client_id)?.name || 'Client Name'}</p>
                  <p className="text-gray-600">{clients.find(c => c.id === formData.client_id)?.email || ''}</p>
                </div>
                <div className="text-right flex flex-col gap-2">
                  <div className="flex justify-end gap-4"><span className="text-gray-500">Date:</span> <span className="font-medium text-gray-800">{format(new Date(), 'MMM dd, yyyy')}</span></div>
                  <div className="flex justify-end gap-4"><span className="text-gray-500">Due Date:</span> <span className="font-medium text-gray-800">{formData.due_date ? format(parseISO(formData.due_date), 'MMM dd, yyyy') : 'Upon receipt'}</span></div>
                  <div className="flex justify-end gap-4"><span className="text-gray-500">Project:</span> <span className="font-medium text-gray-800">{formData.project_name || 'N/A'}</span></div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {formData.line_items.map((item, i) => (
                      <tr key={i} className="text-gray-800">
                        <td className="py-4 px-4">{item.description || 'Item description'}</td>
                        <td className="py-4 px-4 text-right">${item.amount ? Number(item.amount).toFixed(2) : '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mb-12">
                <div className="w-1/2 min-w-[200px]">
                  <div className="flex justify-between py-2 border-b border-gray-200 text-gray-600">
                    <span>Subtotal</span>
                    <span>${formData.line_items.reduce((s, i) => s + Number(i.amount), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 font-bold text-gray-900 text-lg border-b-2 border-indigo-600">
                    <span>Total Amount</span>
                    <span>${formData.line_items.reduce((s, i) => s + Number(i.amount), 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {formData.notes && (
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-700 mb-1">Notes & Terms</p>
                  <p className="whitespace-pre-line leading-relaxed">{formData.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
             <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search invoices..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
             </div>
             <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map(status => (
                  <button 
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {status}
                  </button>
                ))}
             </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date / Due</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {inv.invoice_number}
                        <div className="text-xs text-muted-foreground font-normal mt-0.5">{inv.project_name}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{inv.clients?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 font-medium">${Number(inv.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground space-y-1">
                         <div className="flex items-center"><Clock className="w-3 h-3 mr-1 inline"/>Date: {format(parseISO(inv.created_at), 'MM/dd/yyyy')}</div>
                         {inv.due_date && <div className="text-primary font-medium">Due: {format(parseISO(inv.due_date), 'MM/dd/yyyy')}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {inv.status !== 'Paid' && (
                            <button onClick={() => updateStatus(inv.id, 'Paid')} title="Mark as Paid" className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-md bg-background border border-border"><CheckCircle className="w-4 h-4" /></button>
                          )}
                          {inv.status === 'Draft' && (
                            <button onClick={() => updateStatus(inv.id, 'Sent')} title="Mark as Sent" className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md bg-background border border-border"><Send className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => {
                            setFormData({
                              id: inv.id,
                              client_id: inv.client_id,
                              project_name: inv.project_name,
                              due_date: inv.due_date || '',
                              notes: inv.notes || '',
                              line_items: inv.line_items || []
                            });
                            setShowForm(true);
                          }} className="p-1.5 text-muted-foreground hover:text-primary rounded-md bg-background border border-border"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteInvoice(inv.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md bg-background border border-border"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                     <tr>
                       <td colSpan={6} className="text-center py-12 text-muted-foreground">
                         <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                         No invoices found. Check your filters or create a new one.
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
