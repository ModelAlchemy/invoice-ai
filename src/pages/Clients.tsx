import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Trash2, Building, Phone, Mail, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  });

  useEffect(() => {
    fetchClients();
  }, [user]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error('Error fetching clients: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (formData.id) {
        // Update
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            notes: formData.notes,
          })
          .eq('id', formData.id);
        
        if (error) throw error;
        toast.success('Client updated successfully');
      } else {
        // Insert
        const { error } = await supabase
          .from('clients')
          .insert([{
            user_id: user.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            notes: formData.notes,
          }]);
        
        if (error) throw error;
        toast.success('Client added successfully');
      }
      
      setShowForm(false);
      setFormData({ id: '', name: '', email: '', phone: '', company: '', notes: '' });
      fetchClients();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (client: Client) => {
    setFormData({
      id: client.id,
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      notes: client.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      toast.success('Client deleted successfully');
      fetchClients();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground animate-pulse">Loading clients...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-2">Manage your client directory.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: '', name: '', email: '', phone: '', company: '', notes: '' });
            setShowForm(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{formData.id ? 'Edit Client' : 'New Client'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Company</label>
                <input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-foreground bg-muted hover:bg-muted/80 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium">Save Client</button>
            </div>
          </form>
        </div>
      )}

      {!showForm && clients.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No clients found</h3>
          <p className="text-muted-foreground mt-1">Get started by creating your first client.</p>
        </div>
      )}

      {clients.length > 0 && !showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <div key={client.id} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => handleEdit(client)} className="p-1.5 text-muted-foreground hover:text-primary bg-background rounded-md border border-border"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(client.id)} className="p-1.5 text-muted-foreground hover:text-destructive bg-background rounded-md border border-border"><Trash2 className="w-4 h-4" /></button>
              </div>
              <h3 className="font-semibold text-lg text-foreground pr-16 truncate">{client.name}</h3>
              {client.company && (
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <Building className="w-4 h-4 mr-2" />
                  {client.company}
                </div>
              )}
              {client.email && (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Mail className="w-4 h-4 mr-2" />
                  {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Phone className="w-4 h-4 mr-2" />
                  {client.phone}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
