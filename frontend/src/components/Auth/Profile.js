import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import logger from '../../utils/logger';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  LinkIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
  ClockIcon,
  CameraIcon,
  PencilIcon,
  XMarkIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import ProfileResume from './ProfileResume';
import AdditionalDegreesForm from '../Profile/AdditionalDegreesForm';
import ProfessionalAchievementsForm from '../Profile/ProfessionalAchievementsForm';
import { useProfileAchievements } from '../../hooks/useProfileAchievements';
import { supabase } from '../../utils/supabase';
import toast from 'react-hot-toast';
import { loadProfileSocialLinks, saveProfileSocialLinks } from '../../services/socialLinks.js';
import { findDuplicateProvider } from '../../services/socialLinks.validation';
import DegreeSelect from '../academics/DegreeSelect';
import DepartmentSelect from '../academics/DepartmentSelect';
import { useAcademicsCatalog } from '../../hooks/useAcademicsCatalog';
import { useProfileDegrees } from '../../hooks/useProfileDegrees';
import Avatar from '../common/Avatar';
import AvatarService from '../../services/avatar';
import { useAvatar } from '../../hooks/useAvatar';
import { 
  getEffectiveBatchYear, 
  formatBatchLabel, 
  validateBatchYear, 
  getBatchYearLabel,
  getBatchYearPlaceholder,
  getProfileYearWriteFields 
} from '../../utils/batchYear';
import { COUNTRY_CODE_OPTIONS, getCountryByCode } from '../../constants/countryCodes';
import { getAccountStatus } from '../../utils/accountStatus';

// Normalize phone to strict E.164 (+digits, 7-15 digits) or null to satisfy DB constraint chk_phone_e164
const normalizePhone = (raw) => {
  const input = (raw ?? '').trim();
  if (!input) return null; // empty -> NULL passes CHECK
  const digits = input.replace(/[^0-9]/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { error: 'Please enter a valid phone in international format (E.164), e.g. +14155552671 or 9876543210 (7-15 digits).' };
  }
  return `+${digits}`;
};

// Best-effort split of a stored E.164 phone into country calling code and local digits
const splitPhoneForUi = (rawPhone) => {
  const norm = normalizePhone(rawPhone);
  if (!norm || typeof norm === 'object') {
    return { code: '+91', local: '' };
  }

  // Find the longest matching country code prefix from our known list
  let best = null;
  for (const opt of COUNTRY_CODE_OPTIONS) {
    if (norm.startsWith(opt.code)) {
      if (!best || opt.code.length > best.code.length) {
        best = opt;
      }
    }
  }

  if (best) {
    const localDigits = norm.slice(best.code.length).replace(/[^0-9]/g, '');
    return { code: best.code, local: localDigits };
  }

  // Fallback: default to +91 and treat the rest as local digits
  const digits = norm.replace(/[^0-9]/g, '');
  const localDigits = digits.startsWith('91') ? digits.slice(2) : digits;
  return { code: '+91', local: localDigits };
};

// Normalize social URLs to ensure exactly one https:// and avoid partial scheme duplication
const normalizeUrl = (value) => {
  if (!value) return '';
  const stripped = String(value).replace(/^[a-z]+:\/*/i, '');
  if (stripped.trim() === '') return '';
  return `https://${stripped}`;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, updateProfile, getUserRole, fetchUserProfile } = useAuth();
  const queryClient = useQueryClient();
  
  // Centralized avatar hook
  const { avatarUrl, loading: avatarLoading, refetch: refetchAvatar } = useAvatar(user?.id, {
    useSignedUrl: true,
    autoFetch: !!user?.id,
  });
  
  // Additional component loading state for transitional periods
  const [isComponentLoading, setIsComponentLoading] = useState(true);
  const initialLoadComplete = useRef(false);
  
  // All useState hooks must be at the top level, before any conditional returns
  const [companyId, setCompanyId] = useState(null);
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    industry: '',
    website_url: '',
    location: '',
    description: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const initialFormRef = useRef(null);
  // DB-driven academics catalog
  const { isValidDegree, isValidDepartmentFor, loading: catalogLoading, degrees, getDepartments } = useAcademicsCatalog();
  const { additionalDegrees } = useProfileDegrees();
  const [skillInput, setSkillInput] = useState('');

  // Achievements for this profile (used in read-only Skills & Achievements card)
  const { achievements: achievementsList = [] } = useProfileAchievements();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    about: '',
    company: '',
    position: '',
    experience: '',
    degree_code: '',
    department_id: '',
    batchYear: '', // Unified field for both graduation_year and expected_graduation_year
    expected_graduation_year: '', // Keep for backward compat during transition
    student_id: '',
    date_of_birth: '',
    skills: [],
    achievements: [],
    interests: [],
    languages: [],
    industry: '',
    company_size: '',
    company_website: '',
    socialLinks: {
      linkedin: '',
      facebook: '',
      twitter: '',
      website: ''
    }
  });

  // Track validation errors for form fields
  const [validationErrors, setValidationErrors] = useState({});

  // Define isEmployer constant
  const isEmployer = getUserRole() === 'employer';
  const isStudent = getUserRole() === 'student';
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneLocal, setPhoneLocal] = useState('');
  
  // Handle changes to company form fields
  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to fetch company data for employer users
  const fetchCompanyData = async (userId) => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', userId)
        .single();

      if (error) {
        // It's okay if no company is found, just log other errors
        if (error.code !== 'PGRST116') { 
          logger.error('Error fetching company data:', error);
        }
        return null;
      }
      return companies;
    } catch (error) {
      logger.error('Error in fetchCompanyData:', error);
      return null;
    }
  };
  
  // Track authentication state changes to manage component loading
  useEffect(() => {
    logger.log('Profile component auth state effect:', { loading, user, profile });
    
    // Only show loading on initial load, not on subsequent updates
    if (!initialLoadComplete.current) {
      if (loading) {
        setIsComponentLoading(true);
        return;
      }
      // Finalize initial load even if profile is null so we render the empty state
      setIsComponentLoading(false);
      initialLoadComplete.current = true;
    }
  }, [loading, user, profile]);
  
  // Update imageUrl when avatarUrl from hook changes (unless we have a local preview)
  useEffect(() => {
    if (!imageFile && avatarUrl) {
      setImageUrl(avatarUrl);
    } else if (!imageFile && !avatarUrl && profile?.avatar_url) {
      // Fallback to profile.avatar_url if hook hasn't loaded yet
      setImageUrl(profile.avatar_url);
    } else if (!imageFile && !avatarUrl) {
      setImageUrl(null);
    }
  }, [avatarUrl, profile?.avatar_url, imageFile]);
  
  // Helper functions to deeply clean "Not specified" values
  const cleanValue = (value) => {
    // Return empty string for any 'Not specified' value
    if (value === 'Not specified' || value === null || value === undefined) {
      return '';
    }
    return value;
  };
  
  // Recursively clean an object or array
  const deepClean = (obj) => {
    if (!obj) return obj;
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => {
        if (typeof item === 'object' && item !== null) {
          return deepClean(item);
        }
        return cleanValue(item);
      });
    }
    
    // Handle objects
    if (typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          cleaned[key] = deepClean(value);
        } else {
          cleaned[key] = cleanValue(value);
        }
      }
      return cleaned;
    }
    
    return cleanValue(obj);
  };
  
  // Check if a value should be displayed
  const hasValue = (value) => {
    if (value === undefined || value === null || value === '' || value === 'Not specified') {
      return false;
    }
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    
    return true;
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.first_name) {
      errors.first_name = 'First name is required';
    }
    
    if (!formData.last_name) {
      errors.last_name = 'Last name is required';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    // Validate achievements if any exist
    if (Array.isArray(formData.achievements)) {
      // Filter out empty achievements
      const validAchievements = formData.achievements.filter(achievement => 
        achievement && typeof achievement === 'object' && achievement.title && achievement.title.trim() !== ''
      );
      
      // Replace achievements array with only valid ones
      formData.achievements = validAchievements;
    } else {
      // Ensure achievements is an array
      formData.achievements = [];
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Initialize form with user data
  useEffect(() => {
    if (user && profile) {
      const initializeForm = async () => {
        setIsComponentLoading(true);
        try {
          // Deep clean the profile data first to remove all 'Not specified' values
          const cleanedProfile = deepClean(profile);
          let initialCompany = cleanedProfile.company || '';

          // Fetch and integrate company data if the user is an employer
          let companyFormDataClean = {};
          if (isEmployer) {
            const companyData = await fetchCompanyData(user.id);
            if (companyData) {
              // Clean company data
              companyFormDataClean = deepClean(companyData);
              setCompanyFormData(companyFormDataClean);
              setCompanyId(companyData.id);
              
              // Set the authoritative company name
              initialCompany = companyFormDataClean.name || initialCompany;
            }
          }


          logger.log('Setting initial company name:', initialCompany);
          logger.log('Cleaned profile data:', cleanedProfile);

          // Precompute effective batch/graduation year from all possible sources and log
          const effectiveBatchYear = getEffectiveBatchYear(cleanedProfile);
          logger.log('[Profile] Year fields snapshot:', {
            id: cleanedProfile.id,
            role: cleanedProfile.role,
            graduation_year: cleanedProfile.graduation_year,
            expected_graduation_year: cleanedProfile.expected_graduation_year,
            batch_year: cleanedProfile.batch_year,
            effectiveBatchYear,
          });

          if ((cleanedProfile.role === 'student' || cleanedProfile.role === 'mentee') && effectiveBatchYear == null) {
            logger.warn('[Profile] Student/Mentee profile missing effective batch year after initialization', {
              id: cleanedProfile.id,
              graduation_year: cleanedProfile.graduation_year,
              expected_graduation_year: cleanedProfile.expected_graduation_year,
              batch_year: cleanedProfile.batch_year,
            });
          }

          // Set the main form data with potentially updated company name
          const formDataInitial = {
            first_name: cleanedProfile.first_name || '',
            last_name: cleanedProfile.last_name || '',
            email: cleanedProfile.email || user.email || '',
            phone: cleanedProfile.phone || '',
            location: cleanedProfile.location || '',
            headline: cleanedProfile.headline || '',
            about: cleanedProfile.about || '',
            company: cleanedProfile.company_name || initialCompany, // Map to company_name from backend
            position: cleanedProfile.current_job_title || '', // Map to current_job_title from backend
            experience: cleanedProfile.experience || '',
            degree_code: cleanedProfile.degree_code || '',
            department_id: cleanedProfile.department_id || '',
            // Use centralized helper to get effective batch year from any source
            batchYear: effectiveBatchYear || '',
            graduation_year: cleanedProfile.graduation_year || '',
            expected_graduation_year: cleanedProfile.expected_graduation_year || '',
            student_id: cleanedProfile.student_id || '',
            date_of_birth: cleanedProfile.date_of_birth || '',
            industry: cleanedProfile.industry || '',
            company_size: cleanedProfile.company_size || '',
            company_website: cleanedProfile.company_website || '',
            skills: Array.isArray(cleanedProfile.skills) ? cleanedProfile.skills : [],
            achievements: Array.isArray(cleanedProfile.achievements) ? cleanedProfile.achievements.map(achievement => {
              // Handle null or undefined achievement
              if (achievement === null || achievement === undefined) {
                return { title: '', description: '' };
              }
              
              // Handle achievement as object
              if (typeof achievement === 'object' && achievement !== null) {
                return {
                  title: achievement.title || '',
                  description: achievement.description || ''
                };
              } 
              
              // Handle achievement as string (possibly JSON)
              if (typeof achievement === 'string') {
                if (achievement.trim() === '') {
                  return { title: '', description: '' };
                }
                
                try {
                  // Try to parse if it's a JSON string
                  const parsed = JSON.parse(achievement);
                  if (parsed && typeof parsed === 'object') {
                    return {
                      title: parsed.title || '',
                      description: parsed.description || ''
                    };
                  }
                } catch (e) {
                  // If not valid JSON, use as title
                  return { title: achievement, description: '' };
                }
              }
              
              // Default fallback for any other type
              return { title: String(achievement || ''), description: '' };
            }) : [],
            interests: Array.isArray(cleanedProfile.interests) ? cleanedProfile.interests : [],
            languages: Array.isArray(cleanedProfile.languages) ? cleanedProfile.languages : [],
            // Load social links from dedicated table/view
            socialLinks: (() => {
              // placeholder; will be replaced below after async load
              return { linkedin: '', facebook: '', twitter: '', website: '' };
            })()
          };

          // Replace social links by fetching from view/table
          try {
            const links = await loadProfileSocialLinks(user.id);
            formDataInitial.socialLinks = {
              linkedin: links.linkedin || '',
              facebook: links.facebook || '',
              // UI uses 'twitter' field; map X -> twitter
              twitter: links.x || '',
              website: links.website || '',
            };
          } catch (e) {
            logger.warn('Failed to load social links (non-fatal):', e);
          }
          
          logger.log('Final form data being set:', formDataInitial);
          setFormData(formDataInitial);

          const rawPhone = (formDataInitial.phone || '').trim();
          if (rawPhone) {
            const { code, local } = splitPhoneForUi(rawPhone);
            setPhoneCountryCode(code);
            setPhoneLocal(local);
          } else {
            setPhoneCountryCode('+91');
            setPhoneLocal('');
          }

        } catch (error) {
          logger.error('Error in profile initialization:', error);
          toast.error('Failed to initialize profile data');
        } finally {
          setIsComponentLoading(false);
        }
      };

      initializeForm();
    }
  }, [user, profile, isEmployer]);

  // Track initial snapshot when entering edit mode and guard before unload
  useEffect(() => {
    if (isEditing) {
      // Snapshot current form data to compare for unsaved changes
      initialFormRef.current = formData;
    }
  }, [isEditing]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      try {
        const hasInitial = !!initialFormRef.current;
        const hasUnsaved = hasInitial && JSON.stringify(formData) !== JSON.stringify(initialFormRef.current);
        if (isEditing && hasUnsaved) {
          e.preventDefault();
          e.returnValue = '';
          return '';
        }
      } catch (_) {
        // no-op
      }
      return undefined;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing, formData]);

  // Intercept in-app navigations (anchor clicks and browser back) when there are unsaved changes
  useEffect(() => {
    const hasUnsaved = () => {
      try {
        const hasInitial = !!initialFormRef.current;
        return isEditing && hasInitial && JSON.stringify(formData) !== JSON.stringify(initialFormRef.current);
      } catch {
        return false;
      }
    };

    const onDocumentClick = (e) => {
      if (!hasUnsaved()) return;
      // Find closest anchor
      const anchor = e.target && typeof e.target.closest === 'function' ? e.target.closest('a') : null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) return;
      // Same-origin or internal route
      if (href.startsWith('/') || href.startsWith(window.location.origin)) {
        const confirmLeave = window.confirm('You have unsaved changes. Leave this page?');
        if (!confirmLeave) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const onPopState = () => {
      if (!hasUnsaved()) return;
      const confirmLeave = window.confirm('You have unsaved changes. Leave this page?');
      if (!confirmLeave) {
        // push current URL back to effectively cancel the back navigation
        window.history.pushState(null, '', window.location.href);
      }
    };

    document.addEventListener('click', onDocumentClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onDocumentClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [isEditing, formData]);

  // Add conditional rendering AFTER all hooks are defined
  if (isComponentLoading || loading) {
    return (
      <div className="text-center p-8 mt-12">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-600 mb-4"></div>
          <p className="text-gray-700">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center p-8">Profile not found.</div>;
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    
    try {
      setIsDeleting(true);
      await AvatarService.deleteAvatar();
      await refetchAvatar(); // Refresh avatar hook
      setImageUrl(null); // Clear local preview
      setImageFile(null); // Clear any pending upload
      toast.success('Profile photo removed successfully');
    } catch (err) {
      logger.error('[Profile] avatar delete error', err);
      toast.error(err?.message || 'Failed to remove profile photo');
    } finally {
      setIsDeleting(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!isEmployer && catalogLoading) {
      toast.error('Degree data is still loading. Please wait and try again.');
      return;
    }

    logger.log('Starting form submission...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort('Request timed out');
    }, 15000); // 15 second timeout

    setIsSubmitting(true);

    try {
      // Build full phone from current UI state (dropdown + local input)
      const fullPhone = phoneLocal ? `${phoneCountryCode} ${phoneLocal}`.trim() : '';

      // Per-country basic length validation based on selected country code
      if (fullPhone) {
        const match = fullPhone.match(/^(\+\d{1,4})/);
        const code = match ? match[1] : null;
        const meta = code ? getCountryByCode(code) : null;
        if (meta && (meta.localMin || meta.localMax)) {
          const digitsOnly = fullPhone.replace(/[^0-9]/g, '');
          const codeDigits = code.replace(/[^0-9]/g, '');
          const localDigits = digitsOnly.startsWith(codeDigits)
            ? digitsOnly.slice(codeDigits.length)
            : digitsOnly;
          const len = localDigits.length;
          if ((meta.localMin && len < meta.localMin) || (meta.localMax && len > meta.localMax)) {
            toast.error(`Phone length looks off for ${meta.name}. Expected ${meta.localMin === meta.localMax ? meta.localMin : `${meta.localMin}-${meta.localMax}`} digits after the country code.`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      const phoneNorm = normalizePhone(fullPhone);
      if (phoneNorm && typeof phoneNorm === 'object' && phoneNorm.error) {
        toast.error(phoneNorm.error);
        setIsSubmitting(false);
        return;
      }

      // ---- Phone uniqueness pre-check (avoid 409) ----
      if (phoneNorm) {
        const { data: existing, error: phoneErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', phoneNorm)
          .neq('id', user.id)
          .maybeSingle();

        if (phoneErr) {
          toast.error('Could not validate phone uniqueness. Please try again.');
          setIsSubmitting(false);
          return;
        }
        if (existing) {
          toast.error('This phone number is already registered to another account.');
          setIsSubmitting(false);
          return;
        }
      }

      // Degree and Department validation via DB catalogs
      const degreeCode = isEmployer ? null : (formData.degree_code ? String(formData.degree_code) : null);

      // Batch/Graduation year validation using centralized helper
      const role = getUserRole();
      const yearValidation = validateBatchYear(formData.batchYear, role);
      if (!yearValidation.isValid) {
        toast.error(yearValidation.error);
        setIsSubmitting(false);
        return;
      }

      // Required field checks
      const missing = [];
      if (!formData.location || !String(formData.location).trim()) missing.push('Location');
      if (!isStudent && (!formData.company || !String(formData.company).trim())) missing.push('Company');
      if (!isStudent && (!formData.position || !String(formData.position).trim())) missing.push('Position');
      if (!isEmployer) {
        if (!isValidDegree(formData.degree_code)) missing.push('Degree');
        if (!isValidDepartmentFor(formData.degree_code, formData.department_id)) missing.push('Department');
      }
      if (missing.length) {
        toast.error(`Please fill: ${missing.join(', ')}`);
        setIsSubmitting(false);
        return;
      }

      // Debug logging for QA
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Profile] Degree/Dept validation', {
          degree: degreeCode,
          department_id: formData.department_id,
        });
      }

      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('Error fetching current profile:', fetchError);
        throw new Error('Failed to load profile data');
      }

      // Use centralized helper to determine which year fields to write
      const userRole = getUserRole();
      const yearFields = getProfileYearWriteFields(userRole, formData.batchYear);
      
      const possibleFields = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: phoneNorm, // normalized to E.164 or null
        location: formData.location,
        current_job_title: formData.position, // Map to backend field
        about: formData.about,
        company_name: formData.company, // Map to backend field
        headline: formData.headline,
        experience: formData.experience,
        degree_code: degreeCode,
        department_id: isEmployer ? null : (formData.department_id || null),
        ...yearFields, // Apply graduation_year and/or expected_graduation_year based on role
        student_id: formData.student_id,
        date_of_birth: formData.date_of_birth,
        skills: formData.skills,
        achievements: Array.isArray(formData.achievements) ? formData.achievements.filter(a => a && typeof a === 'object' && a.title) : [],
        interests: formData.interests,
        languages: formData.languages,
        // Employer-only fields on profiles
        industry: isEmployer ? (formData.industry || null) : null,
        company_size: isEmployer ? (formData.company_size || null) : null,
        company_website: isEmployer ? (formData.company_website || null) : null,
      };

      const profileUpdates = { updated_at: new Date().toISOString() };

      Object.entries(possibleFields).forEach(([key, value]) => {
        if ((currentProfile && key in currentProfile) || value !== undefined) {
          // Handle empty strings for integer fields
          if (key === 'graduation_year' && (value === '' || value === undefined)) {
            profileUpdates[key] = null;
          } else {
            profileUpdates[key] = value;
          }
        }
      });

      // Handle empty strings for fields that need to be null in the database
    ['date_of_birth', 'graduation_year', 'expected_graduation_year', 'student_id'].forEach(field => {
      if (profileUpdates[field] === '') {
        profileUpdates[field] = null;
      }
    });

    // Ensure degree_code/department_id NULL when fields are empty
    if (profileUpdates.degree_code === '' || profileUpdates.degree_code === undefined) {
      profileUpdates.degree_code = null;
    }
    if (profileUpdates.department_id === '' || profileUpdates.department_id === undefined) {
      profileUpdates.department_id = null;
    }
    
    // Convert graduation_year to integer if it exists and is not null
    if (profileUpdates.graduation_year !== null && profileUpdates.graduation_year !== undefined) {
      const yearValue = parseInt(profileUpdates.graduation_year, 10);
      profileUpdates.graduation_year = isNaN(yearValue) ? null : yearValue;
    }
    // Convert expected_graduation_year to integer if it exists and is not null
    if (profileUpdates.expected_graduation_year !== null && profileUpdates.expected_graduation_year !== undefined) {
      const eYear = parseInt(profileUpdates.expected_graduation_year, 10);
      profileUpdates.expected_graduation_year = isNaN(eYear) ? null : eYear;
    }

    // Do not write JSON social_links back to profiles; managed via table

    if (imageFile) {
      logger.log('Uploading new avatar...');
      try {
        // Centralized avatar upload via AvatarService; backend RPC updates avatar metadata
        const { publicUrl } = await AvatarService.uploadAvatar(imageFile);

        logger.log('Avatar uploaded successfully via AvatarService:', publicUrl);

        // Immediately update local preview for instant UI feedback
        if (publicUrl) {
          setImageUrl(publicUrl);
          await refetchAvatar(); // Refresh avatar hook for this page

          // Invalidate global avatar caches so headers, directory, groups, etc. refresh
          try {
            await queryClient.invalidateQueries({ queryKey: ['avatar'] });
            await queryClient.invalidateQueries({ queryKey: ['avatars'] });
          } catch (_) {
            // ignore cache invalidation errors
          }

          // Also update the user object in AuthContext immediately for header, etc.
          if (user) {
            user.avatar = publicUrl;
            user.avatar_url = publicUrl;
          }
        }
      } catch (error) {
        logger.error('Profile picture upload failed:', error);
        toast.error(error.message || 'Failed to upload profile picture');
        // Don't throw the error - let the profile save even if avatar upload fails
        // This way the form submission won't be blocked by avatar issues
      }
    }

    // Remove is_profile_complete as it's a generated column in the database
    // This avoids the error: column "is_profile_complete" can only be updated to DEFAULT
    delete profileUpdates.is_profile_complete;

    logger.log('Updating profile in database with:', JSON.stringify(profileUpdates));
    // Removed Promise.race to ensure the update completes
    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Database update error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from database update');
    }

    logger.log('Profile updated in database:', data);

      // Save social links to dedicated table (view-managed elsewhere)
      try {
        await saveProfileSocialLinks(user.id, {
          linkedin: formData.socialLinks?.linkedin || null,
          facebook: formData.socialLinks?.facebook || null,
          x: formData.socialLinks?.twitter || null,
          website: formData.socialLinks?.website || null,
        });
      } catch (e) {
        logger.error('Saving social links failed:', e);
        toast.error('Failed to update social links');
      }

      if (isEmployer && companyId) {
        const { error: companyUpdateError } = await supabase
          .from('companies')
          .update(companyFormData)
          .eq('id', companyId);

        if (companyUpdateError) throw new Error(`Failed to update company: ${companyUpdateError.message}`);
      }

      logger.log('Updating auth context...');
      try {
        logger.log('Calling updateProfile with:', profileUpdates);
        // Don't race this with a timeout - let it complete normally
        const updatedProfile = await updateProfile(profileUpdates);
        logger.log('Auth context updated successfully', updatedProfile);
        
        // Apply the updated data to the form
        if (updatedProfile) {
          const mappedData = {
            ...formData,
            // Map backend field names to form field names
            first_name: updatedProfile.first_name || formData.first_name,
            last_name: updatedProfile.last_name || formData.last_name,
            phone: updatedProfile.phone || formData.phone,
            location: updatedProfile.location || formData.location,
            position: updatedProfile.current_job_title || formData.position,
            about: updatedProfile.about || formData.about,
            company: updatedProfile.company_name || formData.company,
            headline: updatedProfile.headline || formData.headline,
            experience: updatedProfile.experience || formData.experience,
            degree_code: updatedProfile.degree_code || formData.degree_code,
            department_id: updatedProfile.department_id || formData.department_id,
            batchYear: getEffectiveBatchYear(updatedProfile) || formData.batchYear,
            graduation_year: updatedProfile.graduation_year || formData.graduation_year,
            expected_graduation_year: updatedProfile.expected_graduation_year ?? formData.expected_graduation_year,
            student_id: updatedProfile.student_id || formData.student_id,
            date_of_birth: updatedProfile.date_of_birth || formData.date_of_birth,
            skills: updatedProfile.skills || formData.skills,
            achievements: updatedProfile.achievements || formData.achievements,
            interests: updatedProfile.interests || formData.interests,
            languages: updatedProfile.languages || formData.languages,
            industry: updatedProfile.industry ?? formData.industry,
            company_size: updatedProfile.company_size ?? formData.company_size,
            company_website: updatedProfile.company_website ?? formData.company_website,
            // Keep UI social links from form (table-managed)
            socialLinks: formData.socialLinks,
          };
          setFormData(mappedData);
        }
      } catch (updateError) {
        logger.error('Error updating auth context (non-critical):', updateError);
        // Continue even if auth context update fails - the database update was successful
      }

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      if (isEmployer) {
        navigate('/jobs');
      }
      logger.log('Form submission completed successfully');
      // Force refresh of profile data from server
      if (fetchUserProfile) {
        await fetchUserProfile(user.id);
      }
    } catch (error) {
      logger.error('Profile update error:', error);
      toast.error(
        error.message && error.message.includes('timed out')
          ? 'Request timed out. Please try again.'
          : `Failed to update profile: ${error.message || 'Unknown error'}`
      );
    } finally {
      clearTimeout(timeoutId);
      logger.log('Setting isSubmitting to false');
      setIsSubmitting(false);
      
      // Reset image file state to prevent duplicate uploads
      setImageFile(null);
      
      // Force UI refresh
      setTimeout(() => {
        setFormData(prev => ({...prev}));
      }, 100);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested socialLinks object with normalization only (no early validation)
    if (name.startsWith('socialLinks.')) {
      const key = name.split('.')[1];
      const normalized = normalizeUrl(value);
      setFormData((prev) => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [key]: normalized,
        },
      }));
      return;
    }
    // Handle array fields that need to be split (comma-separated values)
    else if (['skills', 'interests', 'languages'].includes(name)) {
      const items = value.split(/[\s,]+/).map(item => item.trim()).filter(item => item);
      setFormData(prev => ({ ...prev, [name]: items }));
    } 
    // Handle all other fields
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Skills tokenizer handlers
  const addSkill = (val) => {
    const v = (val || '').trim();
    if (!v) return;
    setFormData(prev => ({
      ...prev,
      skills: Array.from(new Set([...(prev.skills || []), v]))
    }));
    setSkillInput('');
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    }
    // Support backspace to delete last chip when input empty
    if (e.key === 'Backspace' && !skillInput && Array.isArray(formData.skills) && formData.skills.length) {
      setFormData(prev => ({
        ...prev,
        skills: prev.skills.slice(0, -1)
      }));
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(s => s !== skill)
    }));
  };

  // Legacy inline achievements handlers removed - achievements now managed via ProfessionalAchievementsForm

  // Avatar uploads are now handled centrally by AvatarService.uploadAvatar

  // Main render logic
  // Compute approval status badge styles using shared account-status helper
  const accountStatus = getAccountStatus(profile);
  const statusLabel = accountStatus?.label || null;
  const statusColor = accountStatus?.badgeClass || '';

  const degreeLabel = Array.isArray(degrees)
    ? (degrees.find(d => String(d.code) === String(formData.degree_code))?.name || null)
    : null;
  const deptList = typeof getDepartments === 'function' ? getDepartments(formData.degree_code) : [];
  const departmentLabel = Array.isArray(deptList)
    ? (deptList.find(d => String(d.id) === String(formData.department_id))?.name || null)
    : null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Profile Settings</h1>
      {/* Profile Header */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <Avatar
                  src={imageUrl || avatarUrl || profile.avatar_url || null}
                  alt={`${formData.first_name || profile.first_name || ''} ${formData.last_name || profile.last_name || ''}`.trim() || 'Profile'}
                  size={128}
                  rounded="full"
                  version={imageFile ? null : profile.updated_at}
                  className="border-2 border-white shadow-md"
                  loading="eager"
                />
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-ocean-500 text-white p-2 rounded-full hover:bg-ocean-600 transition-colors cursor-pointer shadow-md">
                    <CameraIcon className="w-4 h-4" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/jpeg, image/png, image/gif, image/webp"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
              {isEditing && (imageUrl || avatarUrl || profile.avatar_url) && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={isDeleting}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Removing...' : 'Remove Photo'}
                </button>
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formData.first_name} {formData.last_name}</h1>
              <p className="text-ocean-600 font-medium">{formData.headline}</p>
              {(degreeLabel || departmentLabel) && (
                <p className="text-sm text-gray-600">{[degreeLabel, departmentLabel].filter(Boolean).join(' • ')}</p>
              )}
              {statusLabel && (
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
              )}
              {/* Contact information removed from here to avoid duplication */}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/update-password')}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all flex items-center"
              aria-label="Password Configuration"
            >
              <KeyIcon className="w-4 h-4 mr-2" />
              Password Configuration
            </button>

            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="btn-ocean px-4 py-2 rounded-lg flex items-center transition-all hover:scale-105"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information Section */}
          <div className="glass-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 cursor-not-allowed"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <div className="grid grid-cols-[minmax(0,120px)_1fr] gap-3">
                  <select
                    name="phoneCountryCode"
                    value={phoneCountryCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setPhoneCountryCode(code);
                      const digits = phoneLocal.replace(/[^0-9]/g, '');
                      const combined = digits ? `${code} ${digits}` : code;
                      setFormData(prev => ({ ...prev, phone: combined.trim() }));
                    }}
                    className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  >
                    {COUNTRY_CODE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phoneLocal"
                    value={phoneLocal}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                      const codeDigits = phoneCountryCode.replace(/[^0-9]/g, '');
                      let digits = digitsOnly;
                      if (digits.startsWith(codeDigits)) {
                        digits = digits.slice(codeDigits.length);
                      }
                      setPhoneLocal(digits);
                      const combined = digits ? `${phoneCountryCode} ${digits}` : phoneCountryCode;
                      setFormData(prev => ({ ...prev, phone: combined.trim() }));
                    }}
                    onBlur={() => {
                      const full = `${phoneCountryCode} ${phoneLocal}`.trim();
                      const normalized = normalizePhone(full);
                      if (typeof normalized === 'string') {
                        setFormData(prev => ({ ...prev, phone: normalized }));
                      }
                    }}
                    className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="City, Country"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth ? formData.date_of_birth.split('T')[0] : ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* About Me */}
            <div className="mt-6 space-y-2">
              <label className="block text-sm font-medium text-gray-700">About Me</label>
              <textarea
                name="about"
                value={formData.about || ''}
                onChange={handleChange}
                rows={4}
                className="form-textarea w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                placeholder="Tell us about yourself, your experience, and interests..."
              />
            </div>

            {/* Primary Degree (additional degrees managed below via AdditionalDegreesForm) */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Primary Degree</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unified Batch/Graduation Year field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {getBatchYearLabel(getUserRole())}
                    {(getUserRole() === 'alumni' || getUserRole() === 'student') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="number"
                    name="batchYear"
                    value={formData.batchYear || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        batchYear: val === '' ? '' : val
                      }));
                    }}
                    min="1970"
                    max={new Date().getFullYear() + 6}
                    className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                    placeholder={getBatchYearPlaceholder(getUserRole())}
                    required={getUserRole() === 'alumni' || getUserRole() === 'student'}
                  />
                </div>

                {!isEmployer && (
                  <DegreeSelect
                    value={formData.degree_code || ''}
                    onChange={(v) => setFormData(prev => ({ ...prev, degree_code: v, department_id: '' }))}
                    required
                  />
                )}

                {!isEmployer && (
                  <DepartmentSelect
                    degreeCode={formData.degree_code || ''}
                    value={formData.department_id || ''}
                    onChange={(v) => setFormData(prev => ({ ...prev, department_id: v }))}
                    required
                    disabled={!formData.degree_code}
                  />
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Student ID</label>
                  <input
                    type="text"
                    name="student_id"
                    value={formData.student_id || ''}
                    onChange={handleChange}
                    className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                    placeholder="For verification, if applicable"
                  />
                </div>
              </div>
            </div>

            {/* Additional Degrees (optional) - inline below Primary Degree */}
            <AdditionalDegreesForm />
          </div>

          {/* Professional Information Section */}
          <div className="glass-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Professional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Company{!isStudent && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company || ''}
                  onChange={handleChange}
                  required={!isStudent}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Position{!isStudent && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position || ''}
                  onChange={handleChange}
                  required={!isStudent}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Experience</label>
                <input
                  type="text"
                  name="experience"
                  value={formData.experience || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="e.g., 10+ years in marine engineering"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Professional Headline</label>
                <input
                  type="text"
                  name="headline"
                  value={formData.headline || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="e.g., Senior Marine Engineer at Ocean Shipping Ltd."
                />
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Skills</label>
              <div className="w-full px-3 py-2 rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-ocean-500">
                <div className="flex flex-wrap gap-2">
                  {(formData.skills || []).map((skill, idx) => (
                    <span key={`${skill}-${idx}`} className="inline-flex items-center bg-ocean-100 text-ocean-800 px-2 py-1 rounded-full text-xs">
                      {skill}
                      <button type="button" className="ml-1 text-ocean-600 hover:text-ocean-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    className="flex-1 min-w-[160px] outline-none text-sm"
                    placeholder="Type a skill and press Enter"
                  />
                </div>
              </div>
            </div>
            
          </div>

          {/* Professional Achievements (placed directly below Professional Information) */}
          <ProfessionalAchievementsForm />

          {/* Social Links Section */}
          <div className="glass-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Social Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                <input
                  type="text"
                  name="socialLinks.linkedin"
                  value={formData.socialLinks?.linkedin || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="LinkedIn URL or ID (free text)"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Facebook</label>
                <input
                  type="text"
                  name="socialLinks.facebook"
                  value={formData.socialLinks?.facebook || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="Facebook URL or ID (free text)"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Twitter/X</label>
                <input
                  type="url"
                  name="socialLinks.twitter"
                  value={formData.socialLinks?.twitter || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="https://twitter.com/yourname"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Personal Website</label>
                <input
                  type="url"
                  name="socialLinks.website"
                  value={formData.socialLinks?.website || ''}
                  onChange={handleChange}
                  className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={() => {
                const hasInitial = !!initialFormRef.current;
                const hasUnsaved = hasInitial && JSON.stringify(formData) !== JSON.stringify(initialFormRef.current);
                if (!hasUnsaved || window.confirm('Discard unsaved changes?')) {
                  setIsEditing(false);
                }
              }}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto btn-ocean px-6 py-2 rounded-lg disabled:opacity-70 flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Read-only Profile View */}
          {hasValue(formData.about) && (
            <div className="glass-card rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed">{formData.about}</p>
            </div>
          )}

          {/* Professional Information */}
          {(hasValue(formData.position) || hasValue(formData.company) || hasValue(formData.degree_code) || hasValue(formData.department_id) || hasValue(formData.experience)) && (
            <div className="glass-card rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {hasValue(formData.position) && (
                    <div className="flex items-start">
                      <BriefcaseIcon className="w-5 h-5 text-ocean-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{formData.position}</p>
                        {hasValue(formData.company) && (
                          <p className="text-sm text-gray-600">{formData.company}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {(hasValue(formData.degree_code) || hasValue(formData.department_id)) && (
                    <div className="flex items-start">
                      <AcademicCapIcon className="w-5 h-5 text-ocean-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {degrees.find(d => d.degree_code === formData.degree_code)?.degree_label || formData.degree_code}
                        </p>
                        {hasValue(formData.department_id) && (
                          <p className="text-sm text-gray-600">
                            {getDepartments(formData.degree_code).find(dep => dep.id === formData.department_id)?.name || ''}
                          </p>
                        )}
                        {hasValue(formData.batchYear) && (
                          <p className="text-sm text-gray-600">{formatBatchLabel(formData.batchYear)}</p>
                        )}
                        {hasValue(formData.student_id) && (
                          <p className="text-sm text-gray-600">Student ID: {formData.student_id}</p>
                        )}

                        {Array.isArray(additionalDegrees) && additionalDegrees.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {additionalDegrees.map((deg) => (
                              <p key={deg.id} className="text-sm text-gray-600">
                                {deg.degree_code}
                                {deg.institution_name && ` • ${deg.institution_name}`}
                                {deg.graduation_year && ` • Class of ${deg.graduation_year}`}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {hasValue(formData.experience) && (
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Experience</p>
                      <p className="text-gray-700">{formData.experience}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {(hasValue(formData.email) || hasValue(formData.phone) || hasValue(formData.location) || hasValue(formData.date_of_birth)) && (
                    <div>
                      <p className="font-medium text-gray-900 mb-2">Contact Information</p>
                      <div className="space-y-2">
                        {hasValue(formData.email) && (
                          <div className="flex items-center text-gray-600">
                            <EnvelopeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{formData.email}</span>
                          </div>
                        )}
                        {hasValue(formData.phone) && (
                          <div className="flex items-center text-gray-600">
                            <PhoneIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <a href={`tel:${formData.phone}`} className="text-ocean-600 hover:underline">{formData.phone}</a>
                          </div>
                        )}
                        {hasValue(formData.location) && (
                          <div className="flex items-center text-gray-600">
                            <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>{formData.location}</span>
                          </div>
                        )}
                        {hasValue(formData.date_of_birth) && (
                          <div className="flex items-center text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 flex-shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                            <span>{new Date(formData.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Skills & Achievements */}
          {(hasValue(formData.skills) || achievementsList.length > 0 || hasValue(formData.achievements)) && (
            <div className="glass-card rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills & Achievements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasValue(formData.skills) && formData.skills.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, index) => (
                        <span key={index} className="bg-ocean-100 text-ocean-800 px-2 py-1 rounded-md text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Prefer achievementsList from useProfileAchievements; fall back to formData.achievements */}
                {(Array.isArray(achievementsList) && achievementsList.length > 0) ||
                 (Array.isArray(formData.achievements) && formData.achievements.length > 0) ? (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Achievements</h3>
                    <div className="space-y-3">
                      {(achievementsList.length > 0 ? achievementsList : formData.achievements).map((achievement, index) => {
                        const isObject = achievement && typeof achievement === 'object';
                        const title = isObject ? (achievement.title || '') : achievement;
                        const issuer = isObject ? (achievement.issuer || achievement.organization || '') : '';
                        const dateValue = isObject
                          ? (achievement.date_awarded || (achievement.year ? `${achievement.year}-01-01` : null))
                          : null;
                        const url = isObject ? achievement.url : null;

                        const formattedDate = dateValue
                          ? new Date(dateValue).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                            })
                          : '';

                        return (
                          <div key={achievement.id || index} className="border-l-4 border-ocean-500 pl-3">
                            <h4 className="font-medium">{title}</h4>
                            {(issuer || formattedDate) && (
                              <p className="text-xs text-gray-600">
                                {issuer}
                                {issuer && formattedDate ? ' • ' : ''}
                                {formattedDate}
                              </p>
                            )}
                            {isObject && achievement.description && (
                              <p className="text-sm text-gray-700 mt-0.5">{achievement.description}</p>
                            )}
                            {url && (
                              <p className="text-xs mt-0.5">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-ocean-600 hover:text-ocean-700 hover:underline"
                                >
                                  View
                                </a>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Social Links Section */}
          {hasValue(formData.socialLinks) && Object.values(formData.socialLinks).some(link => hasValue(link)) && (
            <div className="glass-card rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Social Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formData.socialLinks).map(([platform, url]) => (
                  hasValue(url) && (
                    <div key={platform} className="flex items-center">
                      <span className="capitalize font-medium text-gray-700 w-24">{platform}:</span>
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-ocean-600 hover:underline truncate"
                      >
                        {url}
                      </a>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Resume Management (read-only surface, edit via dedicated controls inside) */}
          <ProfileResume />
        </div>
      )}
    </div>
  );
};

export default Profile;