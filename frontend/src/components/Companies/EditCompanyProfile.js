import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { useNotification } from '../../hooks/useNotification';
import { BuildingOfficeIcon, GlobeAltIcon, InformationCircleIcon, MapPinIcon, UsersIcon, PhotoIcon } from '@heroicons/react/24/outline';
import EmployerGuard from '../Auth/EmployerGuard';

const EditCompanyProfileContent = ({ user }) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    industry: '',
    location: '',
    company_size: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const { addNotification } = useNotification();

  const fetchCompanyProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile.company_id) {
        throw new Error('No company associated with this account.');
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyError) throw companyError;

      setCompany(companyData);
      setFormData({
        name: companyData.name || '',
        description: companyData.description || '',
        website: companyData.website || '',
        industry: companyData.industry || '',
        location: companyData.location || '',
        company_size: companyData.company_size || '',
      });
      setLogoPreview(companyData.logo_url);
    } catch (error) {
      addNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, addNotification]);

  useEffect(() => {
    fetchCompanyProfile();
  }, [fetchCompanyProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
      const MAX = 2 * 1024 * 1024; // 2MB
      if (!ACCEPT.includes(file.type)) {
        addNotification('Please upload a JPG, PNG, or WebP image.', 'error');
        return;
      }
      if (file.size > MAX) {
        addNotification('Logo image must be 2 MB or smaller.', 'error');
        return;
      }

      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let logoUrl = company.logo_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${company.id}-${Date.now()}.${fileExt}`;
        const filePath = `company-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);
        
        logoUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update({ ...formData, logo_url: logoUrl })
        .eq('id', company.id);

      if (updateError) throw updateError;

      addNotification('Profile updated successfully!', 'success');
      fetchCompanyProfile(); // Refresh data
    } catch (error) {
      addNotification(`Error updating profile: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-8">Loading company profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Company Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label htmlFor="logo" className="block text-sm font-medium text-gray-700">Company Logo</label>
            <div className="mt-1 flex flex-col items-center space-y-4">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo Preview" className="w-32 h-32 rounded-full object-cover" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center">
                  <PhotoIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <input type="file" id="logo" onChange={handleFileChange} className="text-sm" />
              <p className="text-xs text-gray-500 mt-1">Recommended square logo, JPG/PNG/WebP, up to 2 MB.</p>
            </div>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Company Name</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 pl-10 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm" placeholder="e.g., AMET Shipping" />
              </div>
            </div>
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input type="url" name="website" id="website" value={formData.website} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 pl-10 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm" placeholder="https://example.com" />
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Company Description</label>
          <textarea id="description" name="description" rows="4" value={formData.description} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Industry</label>
            <input type="text" name="industry" id="industry" value={formData.industry} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm" placeholder="e.g., Maritime" />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
            <input type="text" name="location" id="location" value={formData.location} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm" placeholder="e.g., Chennai, India" />
          </div>
          <div>
            <label htmlFor="company_size" className="block text-sm font-medium text-gray-700">Company Size</label>
            <select id="company_size" name="company_size" value={formData.company_size} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm">
              <option>1-10 employees</option>
              <option>11-50 employees</option>
              <option>51-200 employees</option>
              <option>201-500 employees</option>
              <option>501-1000 employees</option>
              <option>1001+ employees</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={saving} className="inline-flex justify-center rounded-md border border-transparent bg-ocean-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-ocean-700 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 disabled:bg-gray-400">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function EditCompanyProfile(props) {
  // Guard-before-fetch: only render content when EmployerGuard says OK
  return (
    <EmployerGuard strict={true}>
      {({ hasAccess, loading }) => {
        if (loading) return <div className="text-center p-8">Validating access...</div>;
        if (!hasAccess) return null; // Strict guard will redirect
        return <EditCompanyProfileContent {...props} />;
      }}
    </EmployerGuard>
  );
}
