import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import logger from '../../utils/logger';
import { 
  PhotoIcon,
  CalendarIcon,
  MapPinIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  DocumentTextIcon,
  TagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { mergeAndConvertToUTC, formatInIST, convertToUTCFromIST } from '../../utils/timezone';
import AccessDenied from '../Auth/AccessDenied';

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasPermission, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    longDescription: '',
    category: 'networking',
    type: 'in-person',
    date: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    venue: '',
    address: '',
    virtualLink: '',
    maxAttendees: '',
    price: '',
    priceType: 'free',
    tags: '',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    allowVolunteering: false,
    sponsorInfo: '',
    image: null,
    agenda: [{ time: '', activity: '' }]
  });

  const [errors, setErrors] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const canEditEvents = hasPermission('events:create');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const categories = [
    { value: 'networking', label: 'Networking' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'reunion', label: 'Reunion' },
    { value: 'sports', label: 'Sports' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'career', label: 'Career Development' },
    { value: 'technical', label: 'Technical' },
    { value: 'social', label: 'Social' },
    { value: 'jobs', label: 'Jobs' }
  ];

  // Fetch event data when component mounts
  useEffect(() => {
    if (!canEditEvents) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }

    fetchEvent();
  }, [id, canEditEvents]);

  const fetchEvent = async () => {
    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Event not found');

      // Derive sensible defaults for organizer fields when the event row doesn't have them yet
      const fallbackOrganizerName =
        data.organizer_name ||
        profile?.full_name ||
        `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
        profile?.name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        '';

      const fallbackOrganizerEmail =
        data.organizer_email ||
        profile?.email ||
        user?.email ||
        '';

      const fallbackOrganizerPhone =
        data.organizer_phone ||
        profile?.phone ||
        profile?.phone_number ||
        '';

      // Format the data to match our form structure
      const eventData = {
        title: data.title || '',
        description: data.description || '',
        longDescription: data.long_description || '',
        category: data.category || 'networking',
        type: data.event_type || 'in-person',
        // Convert UTC database times to IST for form display
        date: data.start_date ? formatInIST(data.start_date, 'yyyy-MM-dd') : '',
        startTime: data.start_date ? formatInIST(data.start_date, 'HH:mm') : '',
        endTime: data.end_date ? formatInIST(data.end_date, 'HH:mm') : '',
        registrationDeadline: data.registration_deadline ? formatInIST(data.registration_deadline, 'yyyy-MM-dd') : '',
        venue: data.venue || '',
        address: data.address || '',
        virtualLink: data.virtual_link || '',
        maxAttendees: data.max_attendees || '',
        price: data.price || '',
        priceType: data.price > 0 ? 'paid' : 'free',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
        // Organizer fields: prefer event row values, else fall back to current user's profile once
        organizerName: fallbackOrganizerName,
        organizerEmail: fallbackOrganizerEmail,
        organizerPhone: fallbackOrganizerPhone,
        allowVolunteering: data.allow_volunteering ?? false,
        sponsorInfo: data.sponsor_info || '',
        agenda: data.agenda && data.agenda.length > 0 ? data.agenda : [{ time: '', activity: '' }]
      };
      
      logger.log('Formatted event data:', eventData); // Debug log

      if (isMountedRef.current) {
        setFormData(eventData);
      }
      
      // If there's an image, set the preview
      if (data.featured_image_url && isMountedRef.current) {
        setPreviewImage(data.featured_image_url);
        logger.log('Setting preview image:', data.featured_image_url); // Debug log
      }
    } catch (err) {
      logger.error('Error fetching event:', err);
      toast.error('Failed to load event details');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAgendaChange = (index, field, value) => {
    const newAgenda = [...formData.agenda];
    newAgenda[index][field] = value;
    setFormData(prev => ({ ...prev, agenda: newAgenda }));
  };

  const addAgendaItem = () => {
    setFormData(prev => ({
      ...prev,
      agenda: [...prev.agenda, { time: '', activity: '' }]
    }));
  };

  const removeAgendaItem = (index) => {
    if (formData.agenda.length > 1) {
      const newAgenda = formData.agenda.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, agenda: newAgenda }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.type === 'in-person') {
      if (!formData.venue.trim()) newErrors.venue = 'Venue name is required';
      if (!formData.address.trim()) newErrors.address = 'Address is required';
    }

    if (!formData.title.trim()) newErrors.title = 'Event title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    
    if (formData.type === 'in-person' && !formData.address.trim()) {
      newErrors.address = 'Address is required for in-person events';
    }
    
    if (formData.type === 'virtual' && !formData.virtualLink.trim()) {
      newErrors.virtualLink = 'Virtual link is required for virtual events';
    }
    
    if (formData.priceType === 'paid' && (!formData.price || parseFloat(formData.price) <= 0)) {
      newErrors.price = 'Please enter a valid price amount';
    }
    
    if (!formData.organizerName.trim()) newErrors.organizerName = 'Organizer name is required';
    if (!formData.organizerEmail.trim()) newErrors.organizerEmail = 'Organizer email is required';
    
    // Validate email format
    if (formData.organizerEmail && !/^\S+@\S+\.\S+$/.test(formData.organizerEmail)) {
      newErrors.organizerEmail = 'Please enter a valid email address';
    }

    if (!newErrors.endTime && formData.date && formData.startTime && formData.endTime) {
      try {
        const startUtc = convertToUTCFromIST(formData.date, formData.startTime);
        const endUtc = convertToUTCFromIST(formData.date, formData.endTime);
        if (endUtc <= startUtc) {
          newErrors.endTime = 'End time must be after start time';
        }
      } catch (err) {
        logger.warn('Failed to validate event times', err);
      }
    }

    if (formData.registrationDeadline && formData.date) {
      try {
        const deadlineUtc = convertToUTCFromIST(formData.registrationDeadline, '00:00');
        const eventDateUtc = convertToUTCFromIST(formData.date, '00:00');
        if (deadlineUtc > eventDateUtc) {
          newErrors.registrationDeadline = 'Registration deadline cannot be after the event date';
        }
      } catch (err) {
        logger.warn('Failed to validate registration deadline', err);
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to filter out fields that don't exist in Supabase schema
  const filterValidFields = (data) => {
    // Updated allowed fields based on actual schema
    const allowed = [
      'title', 'description', 'long_description', 'start_date', 'end_date', 'venue', 'address',
      'virtual_link', 'max_attendees', 'price',
      'tags', 'category', 'event_type', 'organizer_name', 'organizer_email', 'organizer_phone',
      'agenda', 'featured_image_url', 'updated_at', 'updated_by',
      'registration_deadline', 'has_cost', 'sponsor_info', 'allow_volunteering'
    ];
    return Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    if (!isMountedRef.current) return;
    setIsSubmitting(true);
    
    try {
      const eventData = {
        title: formData.title,
        description: formData.description.trim(),
        long_description: formData.longDescription.trim(),
        category: formData.category,
        event_type: formData.type,
        // Use mergeAndConvertToUTC to properly convert dates to UTC
        // Use the corrected mergeAndConvertToUTC to properly handle timezone conversion
        start_date: mergeAndConvertToUTC(new Date(formData.date), new Date(`2000-01-01T${formData.startTime}`)),
        end_date: formData.endTime ? mergeAndConvertToUTC(new Date(formData.date), new Date(`2000-01-01T${formData.endTime}`)) : null,
        registration_deadline: formData.registrationDeadline
          ? new Date(formData.registrationDeadline).toISOString()
          : null,
        venue: formData.venue,
        address: formData.address,
        virtual_link: formData.virtualLink,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        price: formData.priceType === 'paid' && formData.price ? parseFloat(formData.price) : 0,
        has_cost: formData.priceType === 'paid',
        sponsor_info: formData.sponsorInfo || null,
        allow_volunteering: !!formData.allowVolunteering,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        organizer_name: formData.organizerName,
        organizer_email: formData.organizerEmail,
        organizer_phone: formData.organizerPhone,
        agenda: Array.isArray(formData.agenda) ? formData.agenda.filter(item => item.time.trim() !== '' || item.activity.trim() !== '') : [],
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };
      
      // Filter out any fields that don't exist in the Supabase schema
      const validEventData = filterValidFields(eventData);
      logger.log('Submitting filtered event data:', validEventData); // Debug log
      
      // Update event in database
      const { error: updateError } = await supabase
        .from('events')
        .update(validEventData)
        .eq('id', id);
      
      if (updateError) throw updateError;

      // Handle image upload if a new image was selected
      if (formData.image && formData.image instanceof File) {
        const BUCKET = 'event-images';
        const ext = (formData.image.name.split('.').pop() || 'avif').toLowerCase();
        const objectPath = `${id}-${Date.now()}.${ext}`;

        // Fetch existing image path for cleanup later
        const { data: existing } = await supabase
          .from('events')
          .select('featured_image_path')
          .eq('id', id)
          .single();
        const oldPath = existing?.featured_image_path || null;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(objectPath, formData.image, {
            upsert: true,
            contentType: formData.image.type || `image/${ext}`,
            cacheControl: '31536000',
          });

        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(objectPath);
        const publicUrl = pub?.publicUrl || '';

        const { error: imageUpdateError } = await supabase
          .from('events')
          .update({ featured_image_url: publicUrl, featured_image_path: objectPath })
          .eq('id', id);

        if (imageUpdateError) {
          // rollback new upload to avoid orphan
          await supabase.storage.from(BUCKET).remove([objectPath]);
          throw imageUpdateError;
        }

        // Best-effort cleanup of the old image
        if (oldPath && oldPath !== objectPath) {
          await supabase.storage.from(BUCKET).remove([oldPath]);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['eventOrganizer', id] });

      toast.success('Event updated successfully!');
      navigate(`/events/${id}`);
    } catch (err) {
      logger.error('Error updating event:', err);
      toast.error('Failed to update event');
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  if (!canEditEvents) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(`/events/${id}`)}
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-2"
        >
          <span className="mr-1">&larr;</span>
          Back to Event
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
        <p className="text-gray-600">Update your event details below</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="glass-card rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`form-input w-full px-3 py-2 rounded-lg ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Enter event title"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="2"
                className={`form-textarea w-full px-3 py-2 rounded-lg ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Brief description of your event (max 200 characters)"
                maxLength="200"
              ></textarea>
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Description
              </label>
              <textarea
                name="longDescription"
                value={formData.longDescription || ''}
                onChange={handleInputChange}
                rows="5"
                className="form-textarea w-full px-3 py-2 rounded-lg"
                placeholder="Provide more details about your event"
              ></textarea>
              <p className="text-sm text-gray-500 mt-1">
                Note: This will be shown in the event details page.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing
              </label>
              <select
                name="priceType"
                value={formData.priceType}
                onChange={handleInputChange}
                className="form-select w-full px-3 py-2 rounded-lg"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {formData.priceType === 'paid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className={`form-input w-full px-3 py-2 rounded-lg ${errors.price ? 'border-red-500' : ''}`}
                  placeholder="Enter price"
                />
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowVolunteering"
                name="allowVolunteering"
                checked={formData.allowVolunteering}
                onChange={handleInputChange}
                className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
              />
              <label htmlFor="allowVolunteering" className="ml-2 block text-sm text-gray-700">
                Allow attendees to sign up as volunteers
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Volunteers can help with event setup, registration, or other tasks
            </p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="glass-card rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Date & Time</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className={`form-input w-full px-3 py-2 rounded-lg ${errors.date ? 'border-red-500' : ''}`}
              />
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className={`form-input w-full px-3 py-2 rounded-lg ${errors.startTime ? 'border-red-500' : ''}`}
              />
              {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className={`form-input w-full px-3 py-2 rounded-lg ${errors.endTime ? 'border-red-500' : ''}`}
              />
              {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Deadline
              </label>
              <input
                type="date"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleInputChange}
                className="form-input w-full px-3 py-2 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank for no deadline</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {formData.type === 'in-person' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue Name *
                </label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue || ''}
                  onChange={handleInputChange}
                  className={`form-input w-full px-3 py-2 rounded-lg ${errors.venue ? 'border-red-500' : ''}`}
                  placeholder="e.g., AMET Campus Auditorium"
                />
                {errors.venue && <p className="text-red-500 text-sm mt-1">{errors.venue}</p>}
              </div>
            )}

            {(formData.type === 'in-person' || formData.type === 'hybrid') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`form-input w-full px-3 py-2 rounded-lg ${errors.address ? 'border-red-500' : ''}`}
                  placeholder="Full address of the venue"
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
            )}

            {(formData.type === 'virtual' || formData.type === 'hybrid') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Virtual Meeting Link
                </label>
                <input
                  type="url"
                  name="virtualLink"
                  value={formData.virtualLink || ''}
                  onChange={handleInputChange}
                  className={`form-input w-full px-3 py-2 rounded-lg ${errors.virtualLink ? 'border-red-500' : ''}`}
                  placeholder="https://zoom.us/j/123456789"
                />
                {errors.virtualLink && <p className="text-red-500 text-sm mt-1">{errors.virtualLink}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Event Image */}
        <div className="glass-card rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Image</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                {previewImage ? (
                  <div className="relative">
                    <img 
                      src={previewImage} 
                      alt="Event cover" 
                      className="mx-auto h-64 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(null);
                        setFormData(prev => ({ ...prev, image: null }));
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                      aria-label="Remove image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> event cover image
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 5MB)</p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sponsor Information */}
        <div className="glass-card rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sponsor Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sponsor Information
            </label>
            <textarea
              name="sponsorInfo"
              value={formData.sponsorInfo}
              onChange={handleInputChange}
              rows="2"
              className="form-textarea w-full px-3 py-2 rounded-lg"
              placeholder="List event sponsors or partners (optional)"
            ></textarea>
          </div>
        </div>

        {/* Organizer Information */}
        <div className="glass-card rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizer Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organizer Name *
              </label>
              <input
                type="text"
                name="organizerName"
                value={formData.organizerName}
                onChange={handleInputChange}
                className={`form-input w-full px-3 py-2 rounded-lg ${errors.organizerName ? 'border-red-500' : ''}`}
                placeholder="Your name"
              />
              {errors.organizerName && <p className="text-red-500 text-sm mt-1">{errors.organizerName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="organizerEmail"
                value={formData.organizerEmail}
                onChange={handleInputChange}
                className={`form-input w-full px-3 py-2 rounded-lg ${errors.organizerEmail ? 'border-red-500' : ''}`}
                placeholder="organizer@email.com"
              />
              {errors.organizerEmail && <p className="text-red-500 text-sm mt-1">{errors.organizerEmail}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="organizerPhone"
                value={formData.organizerPhone}
                onChange={handleInputChange}
                className="form-input w-full px-3 py-2 rounded-lg"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/events/${id}`)}
            className="btn-ocean-outline px-6 py-2 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-ocean px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="loading-wave"></div>
                <div className="loading-wave"></div>
                <div className="loading-wave"></div>
                <span className="ml-2">Updating Event...</span>
              </div>
            ) : (
              'Update Event'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditEvent;