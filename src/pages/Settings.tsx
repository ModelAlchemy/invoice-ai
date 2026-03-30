import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Settings as SettingsIcon, Upload, User, Save, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Admin User',
    email: user?.email || '',
    company_name: 'My Freelance Corp',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Settings updated successfully!');
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto xl:mx-0">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account and billing preferences.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-md font-medium text-sm transition-colors cursor-pointer border border-primary">
            <User className="w-4 h-4" /> Profile Details
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium">Business Profile</h3>
              <p className="text-sm text-muted-foreground mt-1">Update your professional details. This information appears on your generated invoices.</p>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Logo Upload (Mock) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Company Logo</label>
                  <div className="mt-1 flex items-center gap-4">
                    <div className="h-16 w-16 bg-muted border border-border rounded-md flex items-center justify-center text-muted-foreground overflow-hidden">
                      <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <button type="button" className="flex items-center gap-2 bg-background border border-border text-foreground hover:bg-muted px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      <Upload className="w-4 h-4" /> Upload new
                    </button>
                    <span className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-1 focus:ring-primary focus:outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={formData.email} 
                      className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed focus:outline-none text-sm" 
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">Managed by Supabase Auth</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Company Name</label>
                    <input 
                      type="text" 
                      value={formData.company_name} 
                      onChange={e => setFormData({...formData, company_name: e.target.value})} 
                      className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-1 focus:ring-primary focus:outline-none text-sm" 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-md font-medium text-sm transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


