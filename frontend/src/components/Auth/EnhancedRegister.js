import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import Logo from '../common/Logo';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, CheckIcon, ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline'; 
import { supabase, signInWithGoogle, signInWithLinkedIn } from '../../utils/supabase';
import { saveProfileSocialLinks } from '../../services/socialLinks';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../utils/errors';
import { ROLES, isRole } from '../../constants/roles';
import { COUNTRY_CODE_OPTIONS, getCountryByCode } from '../../constants/countryCodes';
import { validatePassword } from '../../utils/passwordPolicy';
// Removed DegreeComboBox and DepartmentInput imports - using simple <select> dropdowns backed by Supabase views
import DegreeSelect from '../academics/DegreeSelect';
import DepartmentSelect from '../academics/DepartmentSelect';
import { useAcademicsCatalog } from '../../hooks/useAcademicsCatalog';
import { 
  validateBatchYear, 
  getBatchYearLabel, 
  getBatchYearPlaceholder,
  getProfileYearWriteFields 
} from '../../utils/batchYear';

const EnhancedRegister = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const BANNER_DURATION_MS = 2500;                // 2–3s
  const REDIRECT_AFTER_REGISTER = '/';            // change to '/home' if you want
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  
  // Shared academics catalog (degrees + grouped departments)
  const { isValidDegree, isValidDepartmentFor, loading: catalogLoading } = useAcademicsCatalog();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    primaryRole: '', // alumni, student, employer
    graduationYear: '',
    expectedGraduationYear: '',
    degree_code: '',      // canonical degree code
    department_id: '',    // UUID from departments.id
    studentId: '',
    companyName: '',
    jobTitle: '',
    companySize: '',
    industry: '',
    linkedinProfile: '',
    facebookId: '',
    websiteUrl: '',
    companyWebsite: '',
    interestedInMentorship: false,
    mentorshipRole: '', // mentor, mentee, both
    experienceYears: '',
    skills: [],
    interests: [],
    mentorshipGoals: '',
    currentLocation: '',
    bio: '',
    agreeToTerms: false,
    agreeToMentorship: false, // Specific to mentorship section
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Retained for general loading if needed elsewhere
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    emailTouched: false  // Track if email field has been blurred
  });
  const [error, setError] = useState(''); // For general form errors or success messages
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneLocal, setPhoneLocal] = useState('');
  const STORAGE_KEY = 'onboarding_registration_v1';
  const [showQr, setShowQr] = useState(false);

  // Close QR modal on Escape
  useEffect(() => {
    if (!showQr) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowQr(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showQr]);

  const SAFE_PROFILE_FIELDS = [
    'id',
    'email',
    'first_name',
    'last_name',
    'phone',
    'avatar_url',
    'location',
    'graduation_year',
    'degree_code',
    'department_id',
    'expected_graduation_year',
    'student_id',
    'company_name',
    'current_job_title',
    'industry',
    'company_size',
    'company_website',
    'role',
    // Optional profile fields that have dedicated columns and are editable in Profile Settings
    'about',
    'experience',
    'skills',
    'interests',
    // Social links stored directly in profiles table
    'linkedin_url',
    'facebook_id',
    'website',
  ];

  const pickSafeProfileFields = (src) => {
    const out = {};
    for (const k of SAFE_PROFILE_FIELDS) if (k in src && src[k] !== undefined) out[k] = src[k];
    return out;
  };

  const normalizeHttpsUrl = (raw) => {
    if (!raw) return null;
    let v = String(raw).trim();
    if (!v) return null;
    if (/^http:\/\//i.test(v)) v = v.replace(/^http:\/\//i, 'https://');
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    return v;
  };

  const normalizePhoneForDb = (raw) => {
    if (!raw) return null;
    let v = String(raw).trim();
    if (!v) return null;

    v = v.replace(/[^0-9+]/g, '');

    if (v.includes('+')) {
      const plusIndex = v.indexOf('+');
      v = '+' + v.slice(plusIndex + 1).replace(/\+/g, '');
    } else {
      v = `+${v}`;
    }

    if (!/^\+[1-9][0-9]{6,14}$/.test(v)) {
      return null;
    }

    return v;
  };

  const isValidHttpsUrl = (v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' && !!u.hostname;
    } catch {
      return false;
    }
  };

  // Set roles for dropdown
  useEffect(() => {
    setRoles([
      { name: 'alumni', description: 'Alumni' },
      { name: 'student', description: 'Student' },
      { name: 'employer', description: 'Employer' },
    ]);
  }, []);

  // Degree program options (consolidated exact set provided)
  // Use canonical code/label pairs from hooks instead of free-text list

  const skillOptions = [
    'Marine Engineering', 'Naval Architecture', 'Port Operations', 'Shipping Management',
    'Offshore Engineering', 'Maritime Law', 'Logistics & Supply Chain', 'Project Management',
    'Leadership & Management', 'Business Development', 'Technical Sales & Marketing', 'Research & Development',
    'Vessel Operations', 'Chartering & Broking', 'Marine Surveying', 'HSEQ',
  ];

  const interestOptions = [
    'Career Advancement', 'Technical Skill Development', 'Leadership & Management Skills', 'Business & Entrepreneurship',
    'Networking Opportunities', 'Industry Trends & Insights', 'Further Education & Certifications', 'Innovation & Technology',
    'Sustainability in Maritime', 'Maritime Policy & Regulation', 'Personal Development', 'International Maritime Markets',
  ];

  // Degree/Department catalogs are provided by useAcademicsCatalog via the reusable selects

  // Restore persisted onboarding state from localStorage and honor explicit step query
  useEffect(() => {
    try {
      let targetStep = 1;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.formData && typeof parsed.formData === 'object') {
            setFormData(prev => ({ ...prev, ...parsed.formData }));
          }
          if (parsed.currentStep && [1, 2].includes(parsed.currentStep)) {
            targetStep = parsed.currentStep;
          }
        }
      }

      try {
        const params = new URLSearchParams(window.location.search || '');
        const stepParam = parseInt(params.get('step') || '', 10);
        if (stepParam === 2) {
          targetStep = 2;
        }
      } catch (_) {
        // Ignore URL parsing errors
      }

      setCurrentStep(targetStep);
    } catch (e) {
      logger.warn('Failed to restore onboarding state:', e);
    }
  }, []);

  // Persist onboarding state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, currentStep }));
    } catch (e) {
      // Ignore write errors (e.g., storage full)
    }
  }, [formData, currentStep]);

  // Warn on unsaved changes if navigating away
  useEffect(() => {
    const isDirty = () => {
      // Consider the form dirty if any input has a value or any array has length
      const { firstName, lastName, email, password, phone, primaryRole, graduationYear, expectedGraduationYear, degreeCode, departmentId, studentId, companyName, jobTitle, linkedinProfile, facebookId, websiteUrl, bio } = formData;
      return [firstName, lastName, email, password, phone, primaryRole, graduationYear, expectedGraduationYear, degreeCode, departmentId, studentId, companyName, jobTitle, linkedinProfile, facebookId, websiteUrl, bio].some(v => (Array.isArray(v) ? v.length > 0 : (v && String(v).trim() !== '')));
    };
    const beforeUnload = (e) => {
      if (!showSuccessModal && !showCompletionBanner && isDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [formData, showSuccessModal, showCompletionBanner]);
  
  // Reset mentorship role when primaryRole changes to ensure compatibility
  useEffect(() => {
    if (formData.mentorshipRole) {
      // Define which mentorship roles are valid for each primary role
      const validRoles = {
        'alumni': ['mentor', 'mentee', 'both'],
        'employer': ['mentor', 'mentee', 'both'],
        'student': ['mentee']
      };
      
      const validForCurrentRole = validRoles[formData.primaryRole] || [];
      
      // If current mentorship role is not valid for selected primary role, reset it
      if (!validForCurrentRole.includes(formData.mentorshipRole)) {
        setFormData(prev => ({
          ...prev,
          mentorshipRole: ''
        }));
      }
    }
  }, [formData.primaryRole]);

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    if (name === 'email') {
      const email = value.toLowerCase().trim();
      setErrors(prev => ({ ...prev, emailTouched: true }));
      
      if (!email) {
        setErrors(prev => ({
          ...prev,
          [name]: 'Email is required.'
        }));
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrors(prev => ({
          ...prev,
          [name]: 'Please enter a valid email address (e.g., example@domain.com)'
        }));
      } else if (/\.co$/.test(email)) {
        setErrors(prev => ({
          ...prev,
          [name]: '".co" domains are not accepted - did you mean ".com"?'
        }));
      } else if (email !== value) {
        setErrors(prev => ({
          ...prev,
          [name]: 'Email will be saved in lowercase format'
        }));
      } else if (errors[name]) {
        // Clear any existing error if the input is now valid
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let processedValue = value;
    
    // Handle special validation cases
    if (name === 'firstName' || name === 'lastName') {
      // Only allow letters and spaces, no numbers or special characters
      processedValue = value.replace(/[^A-Za-z ]/g, '');

      if (processedValue !== value) {
        setErrors(prev => ({
          ...prev,
          [name]: 'Only letters and spaces are allowed.'
        }));
      } else if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    } else if (name === 'email') {
      // Convert email to lowercase for consistency
      processedValue = value.toLowerCase();
      
      // Only show case warning if the user has finished typing (on blur)
      if (value !== value.toLowerCase() && errors.emailTouched) {
        setErrors(prev => ({
          ...prev,
          [name]: 'Email will be saved in lowercase format'
        }));
      } else if (errors.emailTouched) {
        // Only validate format if the field has been touched (on blur)
        const email = processedValue.trim();
        if (!email) {
          setErrors(prev => ({
            ...prev,
            [name]: 'Email is required.'
          }));
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setErrors(prev => ({
            ...prev,
            [name]: 'Please enter a valid email address (e.g., example@domain.com)'
          }));
        } else if (/\.co$/.test(email)) {
          setErrors(prev => ({
            ...prev,
            [name]: '".co" domains are not accepted - did you mean ".com"?'
          }));
        } else if (errors[name]) {
          // Clear any existing error if the input is now valid
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          });
        }
      }
    } else if (name === 'primaryRole') {
      // When primary role changes, we may need to reset mentorship role
      // This is handled in the useEffect hook, but we should clear errors
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.mentorshipRole;
        return newErrors;
      });
    } else if (name === 'degree_code') {
      // When the degree changes, clear department_id so user must re-pick
      setFormData(prev => ({ ...prev, degree_code: processedValue, department_id: '' }));
      if (errors.degree_code) setErrors(prev => ({ ...prev, degree_code: '' }));
      if (errors.department_id) setErrors(prev => ({ ...prev, department_id: '' }));
      return;
    } else if (name === 'department_id') {
      if (errors.department_id) setErrors(prev => ({ ...prev, department_id: '' }));
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue,
    }));
    
    // Clear specific error when user starts typing/changing value and input is valid
    if (errors[name] && processedValue === value) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Prevent unintended form submission via Enter key across steps
  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTextarea = tag === 'textarea';
      const isButtonOrLink = tag === 'button' || tag === 'a';
      if (!isTextarea && !isButtonOrLink) {
        e.preventDefault();
      }
    }
  };

  const handleSkillToggle = (skill) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
    if (errors.skills) {
      setErrors((prev) => ({ ...prev, skills: '' }));
    }
  };
  
  const [customSkill, setCustomSkill] = useState('');
  
  const handleCustomSkillChange = (e) => {
    setCustomSkill(e.target.value);
  };
  
  const handleCustomSkillAdd = () => {
    if (customSkill.trim()) {
      // Split by comma and/or space and filter out empty items
      const newSkills = customSkill.split(/[,\s]+/).filter(skill => skill.trim());
      
      // Add each new skill if not already included and if under the 5-skill limit
      setFormData(prev => {
        const updatedSkills = [...prev.skills];
        
        for (const skill of newSkills) {
          if (!updatedSkills.includes(skill) && updatedSkills.length < 5) {
            updatedSkills.push(skill);
          }
        }
        
        return {
          ...prev,
          skills: updatedSkills
        };
      });
      
      // Clear input after adding
      setCustomSkill('');
      
      if (errors.skills) {
        setErrors((prev) => ({ ...prev, skills: '' }));
      }
    }
  };

  const handleInterestToggle = (interest) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const validateStep = (stepToValidate) => {
    const newErrors = {};
    
    // Step 1: Basic info validation
    if (stepToValidate === 1) {
      // Name validations
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required.';
      } else if (!/^[A-Za-z ]+$/.test(formData.firstName)) {
        newErrors.firstName = 'First name must contain only letters and spaces.';
      }
      
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required.';
      } else if (!/^[A-Za-z ]+$/.test(formData.lastName)) {
        newErrors.lastName = 'Last name must contain only letters and spaces.';
      }
      
      // Email validations
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required.';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email address is invalid.';
      } else if (/\.co$/i.test(formData.email)) {
        newErrors.email = '".co" domains are not accepted. Please use a ".com" or other valid domain.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address with a proper domain (e.g., example@domain.com)';
      } else if (formData.email !== formData.email.toLowerCase()) {
        // This is a safety check - the handleChange should already convert to lowercase
        newErrors.email = 'Email must be in lowercase format.';
      }
      
      // Password validations
      if (!formData.password) {
        newErrors.password = 'Password is required.';
      } else {
        const policy = validatePassword(formData.password, formData.email);
        if (!policy.ok) {
          newErrors.password = policy.message;
        }
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
      
      // Role and phone validations (phone is required)
      if (!formData.primaryRole) newErrors.primaryRole = 'Please select your primary role.';
      if (!formData.phone || !formData.phone.trim()) {
        newErrors.phone = 'Phone number is required.';
      } else {
        const normalized = normalizePhoneForDb(formData.phone);
        if (!normalized) {
          newErrors.phone = 'Phone must be in international format, e.g. +911234567890 (7-15 digits).';
        } else {
          // Per-country local length validation (best-effort, does not affect DB format)
          const codeMatch = normalized.match(/^(\+\d{1,4})/);
          const code = codeMatch ? codeMatch[1] : null;
          const meta = code ? getCountryByCode(code) : null;
          if (meta && (meta.localMin || meta.localMax)) {
            const digitsOnly = normalized.replace(/[^0-9]/g, '');
            const codeDigits = code.replace(/[^0-9]/g, '');
            const localDigits = digitsOnly.startsWith(codeDigits)
              ? digitsOnly.slice(codeDigits.length)
              : digitsOnly;
            const len = localDigits.length;
            if ((meta.localMin && len < meta.localMin) || (meta.localMax && len > meta.localMax)) {
              newErrors.phone = `Phone length looks off for ${meta.name}. Expected ${meta.localMin === meta.localMax ? meta.localMin : `${meta.localMin}-${meta.localMax}`} digits after the country code.`;
            }
          }
        }
      }
    }
    
    // Step 2: Role-specific details validation + Terms acceptance
    else if (stepToValidate === 2) {
      // Role-specific required fields to eliminate onboarding
      if (formData.primaryRole === 'alumni') {
        // Use centralized validation
        const yearValidation = validateBatchYear(formData.graduationYear, 'alumni');
        if (!yearValidation.isValid) {
          newErrors.graduationYear = yearValidation.error;
        }
        if (!formData.degree_code) {
          newErrors.degree_code = 'Please select your degree.';
        }
        if (!formData.department_id) {
          newErrors.department_id = 'Please select your department.';
        }
        if (!formData.companyName?.trim()) {
          newErrors.companyName = 'Current company is required.';
        }
        if (!formData.jobTitle?.trim()) {
          newErrors.jobTitle = 'Current position is required.';
        }
        if (!formData.currentLocation?.trim()) {
          newErrors.currentLocation = 'Location is required.';
        }
      }
      if (formData.primaryRole === 'student') {
        // Use centralized validation
        const yearValidation = validateBatchYear(formData.expectedGraduationYear, 'student');
        if (!yearValidation.isValid) {
          newErrors.expectedGraduationYear = yearValidation.error;
        }
        if (!formData.degree_code) {
          newErrors.degree_code = 'Please select your degree.';
        }
        if (!formData.department_id) {
          newErrors.department_id = 'Please select your department.';
        }
      }
      // Optional fields: LinkedIn / Facebook / Website are now free-text except basic https check for website
      if (formData.websiteUrl) {
        const normalized = normalizeHttpsUrl(formData.websiteUrl);
        if (!isValidHttpsUrl(normalized)) {
          newErrors.websiteUrl = 'Please enter a valid website (https).';
        }
      }

      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setErrors(newErrors);
    const errorKeys = Object.keys(newErrors);
    const ok = errorKeys.length === 0;
    if (!ok) {
      const count = errorKeys.length;
      // If only the password is invalid, surface a clear password-specific message
      if (count === 1 && errorKeys[0] === 'password' && newErrors.password) {
        toast.error(newErrors.password || 'Password must be at least 12 characters long.');
      } else {
        toast.error(`${count} field${count > 1 ? 's are' : ' is'} required or invalid. Please fix and try again.`);
      }
    }
    return ok;
  };

  const handleNext = async () => {
    // First run local validation for the current step
    if (!validateStep(currentStep)) return;

    // On Step 1, proactively check for existing email/phone in profiles
    if (currentStep === 1) {
      const email = formData.email.trim().toLowerCase();
      const normalizedPhone = normalizePhoneForDb(formData.phone);

      try {
        const { data, error } = await supabase.rpc('registration_check_identity', {
          p_email: email || null,
          p_phone: normalizedPhone || null,
        });

        if (error) {
          logger.error('registration_check_identity RPC error:', error.message || error);
        } else if (data) {
          const emailTaken = !!data.email_taken;
          const phoneTaken = !!data.phone_taken;

          if (emailTaken || phoneTaken) {
            setErrors(prev => ({
              ...prev,
              ...(emailTaken
                ? { email: 'This email address is already registered. Please log in instead.' }
                : {}),
              ...(phoneTaken
                ? { phone: 'This phone number is already registered to a different user. Please log in or use another number.' }
                : {}),
            }));

            const parts = [];
            if (emailTaken) parts.push('email');
            if (phoneTaken) parts.push('phone number');
            const label = parts.join(' and ');

            toast.error(
              `The ${label} you entered is already registered to another user. Please log in or use different details.`
            );
            return; // Do not advance to Step 2
          }
        }
      } catch (err) {
        logger.error('registration_check_identity unexpected error:', err?.message || err);
        // In case of RPC failure, fall through; backend unique constraints still enforce safety
      }
    }

    // Either not Step 1 or identity pre-check passed → advance
    setCurrentStep(currentStep + 1);
    setError(''); // Clear general error message when moving to next step
  };

  const handlePrevious = () => {
    // Keep the form data when going back a step
    setCurrentStep(currentStep - 1);
    setError(''); // Clear general error message when moving to previous step
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double-submit

    if (!validateStep(2)) {
      setError('Please resolve the highlighted fields (make sure to accept Terms) and try again.');
      return;
    }

    // Determine selected role up front
    const selectedRole = isRole(formData.primaryRole) ? formData.primaryRole : 'alumni';

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      if (selectedRole === 'alumni' || selectedRole === 'student') {
        logger.debug('[Register] Submitting with degree_code:', formData.degree_code, 'department_id:', formData.department_id);
      }
    }

    setIsSubmitting(true);
    setError('');

    let didSignUp = false;

    try {
      // Debug: surface submit start in console for easier tracing
      // eslint-disable-next-line no-console
      logger.log('[Register] Submitting signup request...');

      // DB-driven validation for non-employer roles
      const isEmployer = selectedRole === 'employer';
      if (!isEmployer && catalogLoading) {
        toast.error('Degree data is still loading. Please wait and try again.');
        setIsSubmitting(false);
        return;
      }
      if (!isEmployer) {
        if (!isValidDegree(formData.degree_code)) {
          toast.error('Select a valid Degree');
          setIsSubmitting(false);
          return;
        }
        if (!isValidDepartmentFor(formData.degree_code, formData.department_id)) {
          toast.error('Select a valid Department');
          setIsSubmitting(false);
          return;
        }
      }

      // Stage-2 payload mapped to profile columns (avatar omitted intentionally)
      // Use centralized helper to determine which year fields to write
      const yearValue = selectedRole === 'student' 
        ? formData.expectedGraduationYear 
        : formData.graduationYear;
      const yearFields = getProfileYearWriteFields(selectedRole, yearValue);
      
      const stage2 = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: normalizePhoneForDb(formData.phone),
        ...yearFields, // Apply graduation_year and/or expected_graduation_year
        degree_code: (selectedRole === 'alumni' || selectedRole === 'student') ? (formData.degree_code || null) : null,
        department_id: (selectedRole === 'alumni' || selectedRole === 'student') ? (formData.department_id || null) : null,
        company_name: formData.companyName?.trim() || null,
        current_job_title: formData.jobTitle?.trim() || null,
        location: formData.currentLocation?.trim() || null,
        role: selectedRole,
      };

      if (selectedRole === 'student') {
        stage2.student_id = formData.studentId?.trim() || null;
      }
      if (selectedRole === 'employer') {
        stage2.industry = formData.industry?.trim() || null;
        stage2.company_size = formData.companySize || null;
        stage2.company_website = formData.companyWebsite?.trim() || null;
      }

      logger.log('[Register] Email about to sign up:', formData.email);
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: stage2,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        logger.error('Supabase signup error:', error.message);
        throw new Error(error.message.includes('User already registered')
          ? 'A user with this email already exists. Please try logging in.'
          : 'Registration failed. If this keeps happening, try again later or contact support.');
      }

      didSignUp = true;

      // Try to hydrate the session/user; if confirmation required, user may be null
      const { data: { user: hydratedUser } } = await supabase.auth.getUser();

      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }

      if (!hydratedUser?.id) {
        // Email confirmation required: show check-email message, go to login
        setShowSuccessModal(true);
        setTimeout(() => navigate('/login', { replace: true }), 800);
        return;
      }

      // Session present immediately → single write to public.profiles
      const isAlumni = selectedRole === 'alumni';
      const isStudent = selectedRole === 'student';
      const isEmployerRole = selectedRole === 'employer';
      
      // Use centralized helper for year fields
      const yearValueForUpsert = isStudent ? formData.expectedGraduationYear : formData.graduationYear;
      const yearFieldsForUpsert = getProfileYearWriteFields(selectedRole, yearValueForUpsert);
      
      const profilePayloadRaw = {
        id: hydratedUser.id,
        email: hydratedUser.email?.toLowerCase() || formData.email.trim().toLowerCase(),
        first_name: formData.firstName.trim() || null,
        last_name: formData.lastName.trim() || null,
        phone: normalizePhoneForDb(formData.phone),
        role: selectedRole,
        location: formData.currentLocation?.trim() || formData.location?.trim() || null,
        ...yearFieldsForUpsert, // Apply graduation_year and/or expected_graduation_year
        degree_code: (isAlumni || isStudent) ? (formData.degree_code || null) : null,
        department_id: (isAlumni || isStudent) ? (formData.department_id || null) : null,
        student_id: isStudent ? (formData.studentId?.trim() || null) : null,
        company_name: (isAlumni || isEmployerRole) ? (formData.companyName?.trim() || null) : null,
        current_job_title: (isAlumni || isEmployerRole) ? (formData.jobTitle?.trim() || null) : null,
        industry: isEmployerRole ? (formData.industry?.trim() || null) : null,
        company_size: isEmployerRole ? (formData.companySize || null) : null,
        company_website: isEmployerRole ? (formData.companyWebsite?.trim() || null) : null,
        // Optional registration fields persisted into profile so they appear in Edit Profile
        about: formData.bio?.trim() || null,
        experience: formData.experienceYears && String(formData.experienceYears).trim()
          ? String(formData.experienceYears).trim()
          : null,
        skills: Array.isArray(formData.skills) && formData.skills.length ? formData.skills : null,
        interests: Array.isArray(formData.interests) && formData.interests.length ? formData.interests : null,
        linkedin_url: formData.linkedinProfile?.trim() || null,
        facebook_id: formData.facebookId?.trim() || null,
        website: formData.websiteUrl?.trim() || null,
      };
      const profilePayload = pickSafeProfileFields(profilePayloadRaw);

      // eslint-disable-next-line no-console
      logger.log('[Register] Upserting profile with Stage-2 payload:', profilePayload);
      const { data: upsertedProfile, error: upsertErr } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .single();
      if (upsertErr) {
        // Friendly messages
        if (String(upsertErr.message).toLowerCase().includes('foreign key') || upsertErr.code === '23503') {
          toast.error('Please select a valid Degree from the list.');
        }
        if (upsertErr.code === '42501' || upsertErr.code === 'P0001') {
          toast.error('No permission to update this profile.');
        } else {
          toast.error(`Profile save failed: ${getFriendlyErrorMessage(upsertErr, 'Unable to save profile.')}`);
        }
        throw upsertErr;
      }

      if (!upsertedProfile) {
        throw new Error('Profile save failed: no data returned from database.');
      }

      // Defensive check: ensure critical core fields we just collected actually persisted.
      // Note: location is allowed to be null/optional at DB level and is validated per-role earlier,
      // so it is not treated as a hard-fail core field here.
      const coreMissing = [];
      if (!upsertedProfile.first_name) coreMissing.push('first_name');
      if (!upsertedProfile.last_name) coreMissing.push('last_name');
      if (!upsertedProfile.email) coreMissing.push('email');
      if (!upsertedProfile.phone) coreMissing.push('phone');

      if (isAlumni || isStudent) {
        if (!upsertedProfile.degree_code) coreMissing.push('degree_code');
        if (!upsertedProfile.department_id) coreMissing.push('department_id');
      }

      if (isAlumni) {
        if (!upsertedProfile.graduation_year && !upsertedProfile.expected_graduation_year) {
          coreMissing.push('graduation_year/expected_graduation_year');
        }
      }

      if (isStudent) {
        if (!upsertedProfile.expected_graduation_year) {
          coreMissing.push('expected_graduation_year');
        }
      }

      if (isAlumni || isEmployerRole) {
        if (!upsertedProfile.company_name) coreMissing.push('company_name');
        if (!upsertedProfile.current_job_title) coreMissing.push('current_job_title');
      }

      if (coreMissing.length > 0) {
        logger.error('[Register] Profile upsert missing core fields after registration:', {
          userId: hydratedUser.id,
          role: selectedRole,
          coreMissing,
          upsertedProfile,
        });
        throw new Error('Profile save failed. Please try again or contact support.');
      }

      // Seed social_links with optional URLs captured during registration so Profile Settings sees them
      try {
        await saveProfileSocialLinks(hydratedUser.id, {
          linkedin: formData.linkedinProfile || null,
          facebook: formData.facebookId || null,
          website: formData.websiteUrl || null,
        });
      } catch (e) {
        // Non-fatal: profile is created even if social links upsert fails
        // eslint-disable-next-line no-console
        logger.warn('Failed to seed social links during registration:', e);
      }

      // Ensure server-side role is set and JWT refreshed so UI shows correct role immediately
      try {
        const endpoint = process.env.REACT_APP_SUPABASE_URL
          ? `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/set-role`
          : '/functions/v1/set-role';

        const { data: sess } = await supabase.auth.getSession();
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sess?.session?.access_token ? { 'Authorization': `Bearer ${sess.session.access_token}` } : {}),
            ...(process.env.REACT_APP_SUPABASE_KEY ? { 'apikey': process.env.REACT_APP_SUPABASE_KEY } : {}),
          },
          body: JSON.stringify({ role: selectedRole }),
        }).catch(() => undefined);
        await supabase.auth.refreshSession().catch(() => undefined);
      } catch (_) { /* ignore */ }

      // Refresh context cache and show banner with redirect
      await refreshProfile(hydratedUser.id).catch(() => undefined);
      setShowCompletionBanner(true);
      setTimeout(() => {
        navigate(REDIRECT_AFTER_REGISTER, { replace: true });
      }, BANNER_DURATION_MS);
      return;

    } catch (err) {
      // eslint-disable-next-line no-console
      logger.error('Registration process error:', err?.message || err);

      // If signup succeeded but a later step (like profile upsert) failed,
      // treat this as a hard failure by signing the user back out so they
      // are not left in a partially-initialized state.
      if (didSignUp) {
        try {
          await supabase.auth.signOut();
        } catch (signOutErr) {
          logger.warn('Sign-out after failed registration also failed:', signOutErr);
        }
      }

      setError(getFriendlyErrorMessage(err, 'An unexpected error occurred during registration.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (providerAction) => {
    setIsLoading(true);
    setError('');
    try {
      const { error: socialError } = await providerAction();
      if (socialError) throw socialError;
      // Supabase handles redirection or session creation.
      // If direct navigation is needed post-social-login (e.g. to a profile completion step), handle it here or in App.js based on auth state.
      // navigate('/dashboard'); // Example navigation
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Social login failed. Please try again or use email registration.'));
      logger.error('Social login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
      {[1, 2].map((stepNum, index, arr) => (
        <React.Fragment key={stepNum}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ease-in-out
                ${stepNum <= currentStep ? 'bg-ocean-600 text-white ring-2 ring-ocean-600 ring-offset-2' : 'bg-gray-200 text-gray-500'}`}
            >
              {stepNum < currentStep ? <CheckIcon className="w-6 h-6" /> : stepNum}
            </div>
            <p className={`mt-2 text-xs ${stepNum <= currentStep ? 'text-ocean-600 font-medium' : 'text-gray-500'}`}>
              {stepNum === 1 && 'Basic Info'}
              {stepNum === 2 && 'Details'}
            </p>
          </div>
          {index < arr.length - 1 && (
            <div className={`flex-1 h-1 mx-2 transition-all duration-300 ease-in-out ${stepNum < currentStep ? 'bg-ocean-600' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const commonInputClass = (hasError) =>
    `w-full px-3 py-2 border-2 ${hasError ? 'border-red-500' : 'border-ocean-200'} rounded-lg min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:border-ocean-500 placeholder:text-gray-500 shadow-sm`;
  const commonLabelClass = "block text-sm font-medium text-gray-700 mb-1";
  const commonErrorClass = "text-red-500 text-xs mt-1";

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <button type="button" onClick={() => handleSocialLogin(signInWithGoogle)} aria-label="Continue with Google" className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ocean-500 transition-colors">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5 mr-3" />
          Continue with Google
        </button>
        {/* LinkedIn button can be added similarly if configured */}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300" /></div>
        <div className="relative flex justify-center"><span className="px-3 bg-white text-sm text-gray-500">Or register with email</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="firstName" className={commonLabelClass}>First Name *</label>
          <input id="firstName" name="firstName" type="text" required value={formData.firstName} onChange={handleChange} placeholder="Suresh" className={commonInputClass(errors.firstName)} autoCapitalize="off" autoCorrect="off" style={{ textTransform: 'none' }} />
          {errors.firstName && <p className={commonErrorClass}>{errors.firstName}</p>}
        </div>
        <div>
          <label htmlFor="lastName" className={commonLabelClass}>Last Name *</label>
          <input id="lastName" name="lastName" type="text" required value={formData.lastName} onChange={handleChange} placeholder="Kumar" className={commonInputClass(errors.lastName)} autoCapitalize="off" autoCorrect="off" style={{ textTransform: 'none' }} />
          {errors.lastName && <p className={commonErrorClass}>{errors.lastName}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="email" className={commonLabelClass}>Email Address *</label>
        <input 
          id="email" 
          name="email" 
          type="email" 
          autoComplete="email" 
          required 
          value={formData.email} 
          onChange={handleChange} 
          onBlur={handleBlur}
          placeholder="suresh.kumar@example.com" 
          className={commonInputClass(errors.email)} 
        />
        {errors.email && <p className={commonErrorClass}>{errors.email}</p>}
        <p className="text-xs text-gray-500 mt-1">Email will be stored in lowercase. '.co' domains are not allowed.</p>
      </div>
      <div>
        <label htmlFor="phone" className={commonLabelClass}>Phone Number *</label>
        <div className="grid grid-cols-[minmax(0,120px)_1fr] gap-3">
          <select
            id="phoneCountryCode"
            name="phoneCountryCode"
            value={phoneCountryCode}
            onChange={(e) => {
              const code = e.target.value;
              setPhoneCountryCode(code);
              const digits = phoneLocal.replace(/[^0-9]/g, '');
              const combined = digits ? `${code} ${digits}` : code;
              setFormData(prev => ({ ...prev, phone: combined.trim() }));
            }}
            className={`${commonInputClass(null)} bg-white`}
          >
            {COUNTRY_CODE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
          <input
            id="phone"
            name="phoneLocal"
            type="tel"
            autoComplete="tel"
            required
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
            placeholder="9876543210"
            className={commonInputClass(errors.phone)}
          />
        </div>
        {errors.phone && <p className={commonErrorClass}>{errors.phone}</p>}
        <p className="text-xs text-gray-500 mt-1">Your number will be saved in international format, e.g. +91 9876543210.</p>
      </div>
      <div>
        <label htmlFor="primaryRole" className={commonLabelClass}>I am registering as a/an *</label>
        <select id="primaryRole" name="primaryRole" value={formData.primaryRole} onChange={handleChange} required className={`${commonInputClass(errors.primaryRole)} bg-white`}>
          <option value="" disabled>Select your role...</option>
          {roles.map((role) => (<option key={role.name} value={role.name}>{role.description}</option>))}
        </select>
        {errors.primaryRole && <p className={commonErrorClass}>{errors.primaryRole}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="password" className={commonLabelClass}>Password *</label>
          <div className="relative">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className={commonInputClass(errors.password)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none">
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && <p className={commonErrorClass}>{errors.password}</p>}
        </div>
        <div>
          <label htmlFor="confirmPassword" className={commonLabelClass}>Confirm Password *</label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              onPaste={(e) => {
                e.preventDefault();
                setErrors((prev) => ({
                  ...prev,
                  confirmPassword: 'Pasting is disabled for security reasons. Please type your password again.',
                }));
                // Clear error after 3 seconds
                setTimeout(() => {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    if (newErrors.confirmPassword === 'Pasting is disabled for security reasons. Please type your password again.') {
                      delete newErrors.confirmPassword;
                    }
                    return newErrors;
                  });
                }, 3000);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setErrors((prev) => ({
                  ...prev,
                  confirmPassword: 'Dropping text is disabled for security reasons.',
                }));
              }}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              placeholder="••••••••"
              className={commonInputClass(errors.confirmPassword)}
            />
            {showPassword ? (
              <button type="button" onClick={() => setShowPassword(false)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none">
                <EyeSlashIcon className="h-5 w-5" />
              </button>
            ) : null}
          </div>
          {errors.confirmPassword && <p className={commonErrorClass}>{errors.confirmPassword}</p>}
          <div className="flex items-center text-xs text-yellow-700 mt-1 bg-yellow-50 p-1 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Copy-paste is disabled for security reasons - type your password again
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {formData.primaryRole === 'alumni' && (
        <>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Alumni Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="graduationYear" className={commonLabelClass}>Graduation Year *</label>
              <input id="graduationYear" name="graduationYear" type="number" min="1950" max={new Date().getFullYear()} required value={formData.graduationYear} onChange={handleChange} placeholder="YYYY" className={commonInputClass(errors.graduationYear)} />
              {errors.graduationYear && <p className={commonErrorClass}>{errors.graduationYear}</p>}
            </div>
            <div>
              <DegreeSelect
                value={formData.degree_code}
                onChange={(v) => setFormData(prev => ({ ...prev, degree_code: v, department_id: '' }))}
                required
                error={errors.degree_code || null}
              />
            </div>
          </div>
          <div>
            <DepartmentSelect
              degreeCode={formData.degree_code}
              value={formData.department_id}
              onChange={(v) => setFormData(prev => ({ ...prev, department_id: v }))}
              required
              disabled={!formData.degree_code}
              error={errors.department_id || null}
            />
          </div>
          {/* Employment details for alumni */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-2">
            <div>
              <label htmlFor="companyName" className={commonLabelClass}>Current Company *</label>
              <input id="companyName" name="companyName" type="text" required value={formData.companyName} onChange={handleChange} placeholder="e.g., Maersk" className={commonInputClass(errors.companyName)} />
              {errors.companyName && <p className={commonErrorClass}>{errors.companyName}</p>}
            </div>
            <div>
              <label htmlFor="jobTitle" className={commonLabelClass}>Current Position *</label>
              <input id="jobTitle" name="jobTitle" type="text" required value={formData.jobTitle} onChange={handleChange} placeholder="e.g., Chief Officer" className={commonInputClass(errors.jobTitle)} />
              {errors.jobTitle && <p className={commonErrorClass}>{errors.jobTitle}</p>}
            </div>
          </div>
        </>
      )}
      {formData.primaryRole === 'student' && (
        <>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Student Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="studentId" className={commonLabelClass}>Student ID</label>
              <input id="studentId" name="studentId" type="text" value={formData.studentId} onChange={handleChange} placeholder="Optional" className={commonInputClass(errors.studentId)} />
            </div>
            <div>
              <label htmlFor="expectedGraduationYear" className={commonLabelClass}>Expected Graduation Year *</label>
              <input id="expectedGraduationYear" name="expectedGraduationYear" type="number" min="1950" max={new Date().getFullYear() + 6} required value={formData.expectedGraduationYear} onChange={handleChange} placeholder="YYYY" className={commonInputClass(errors.expectedGraduationYear)} />
              {errors.expectedGraduationYear && <p className={commonErrorClass}>{errors.expectedGraduationYear}</p>}
            </div>
          </div>
          <div>
            <DegreeSelect
              value={formData.degree_code}
              onChange={(v) => setFormData(prev => ({ ...prev, degree_code: v, department_id: '' }))}
              required
              error={errors.degree_code || null}
            />
          </div>
          <div>
            <DepartmentSelect
              degreeCode={formData.degree_code}
              value={formData.department_id}
              onChange={(v) => setFormData(prev => ({ ...prev, department_id: v }))}
              required
              disabled={!formData.degree_code}
              error={errors.department_id || null}
            />
          </div>
        </>
      )}
      {formData.primaryRole === 'employer' && (
        <>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Company Details</h3>
          <div className="bg-ocean-50 border-l-4 border-ocean-400 p-4 mb-4 rounded-md">
            <p className="text-sm text-ocean-700">Employer registrations require admin approval. You will be notified by email once your account is active.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="companyName" className={commonLabelClass}>Company Name *</label>
              <input id="companyName" name="companyName" type="text" required value={formData.companyName} onChange={handleChange} placeholder="Maritime Solutions Inc." className={commonInputClass(errors.companyName)} />
              {errors.companyName && <p className={commonErrorClass}>{errors.companyName}</p>}
            </div>
            <div>
              <label htmlFor="jobTitle" className={commonLabelClass}>Your Job Title *</label>
              <input id="jobTitle" name="jobTitle" type="text" required value={formData.jobTitle} onChange={handleChange} placeholder="HR Manager" className={commonInputClass(errors.jobTitle)} />
              {errors.jobTitle && <p className={commonErrorClass}>{errors.jobTitle}</p>}
            </div>
            <div>
              <label htmlFor="industry" className={commonLabelClass}>Industry *</label>
              <input id="industry" name="industry" type="text" required value={formData.industry} onChange={handleChange} placeholder="e.g., Shipping, Logistics, Offshore" className={commonInputClass(errors.industry)} />
              {errors.industry && <p className={commonErrorClass}>{errors.industry}</p>}
            </div>
            <div>
              <label htmlFor="companySize" className={commonLabelClass}>Company Size</label>
              <select id="companySize" name="companySize" value={formData.companySize} onChange={handleChange} className={`${commonInputClass(false)} bg-white`}>
                <option value="">Select size...</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-1000">201-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="companyWebsite" className={commonLabelClass}>Company Website</label>
            <input id="companyWebsite" name="companyWebsite" type="url" value={formData.companyWebsite} onChange={handleChange} placeholder="https://www.maritimesolutions.com" className={commonInputClass(false)} />
          </div>
        </>
      )}
      {/* Common fields for Step 2 - can be placed outside role-specific blocks if applicable to all */}
      <div>
        <label htmlFor="linkedinProfile" className={commonLabelClass}>LinkedIn</label>
        <input
          id="linkedinProfile"
          name="linkedinProfile"
          type="text"
          value={formData.linkedinProfile}
          onChange={handleChange}
          placeholder="LinkedIn URL or ID (free text)"
          className={commonInputClass(errors.linkedinProfile)}
        />
        {errors.linkedinProfile && <p className={commonErrorClass}>{errors.linkedinProfile}</p>}
      </div>
      <div>
        <label htmlFor="facebookId" className={commonLabelClass}>Facebook</label>
        <input
          id="facebookId"
          name="facebookId"
          type="text"
          value={formData.facebookId}
          onChange={handleChange}
          placeholder="Facebook URL or ID (free text)"
          className={commonInputClass(errors.facebookId)}
        />
        {errors.facebookId && <p className={commonErrorClass}>{errors.facebookId}</p>}
      </div>
      {formData.primaryRole !== 'employer' && (
        <div>
          <label htmlFor="websiteUrl" className={commonLabelClass}>Personal Website</label>
          <input id="websiteUrl" name="websiteUrl" type="url" value={formData.websiteUrl} onChange={handleChange} placeholder="https://example.com" className={commonInputClass(errors.websiteUrl)} />
          <p className="text-xs text-gray-500 mt-1">Must be a valid https URL</p>
          {errors.websiteUrl && <p className={commonErrorClass}>{errors.websiteUrl}</p>}
        </div>
      )}
      <div>
        <label htmlFor="currentLocation" className={commonLabelClass}>
          {formData.primaryRole === 'alumni' ? 'Location *' : 'Current Location'}
        </label>
        <input
          id="currentLocation"
          name="currentLocation"
          type="text"
          value={formData.currentLocation}
          onChange={handleChange}
          placeholder="e.g., Chennai, India"
          className={commonInputClass(errors.currentLocation)}
        />
        {errors.currentLocation && <p className={commonErrorClass}>{errors.currentLocation}</p>}
      </div>
      <div>
        <label htmlFor="bio" className={commonLabelClass}>Brief Bio (Optional)</label>
        <textarea id="bio" name="bio" rows={3} value={formData.bio} onChange={handleChange} placeholder="Tell us a bit about yourself, your experience, or interests..." className={`${commonInputClass(false)} min-h-[96px] max-h-[256px] resize-y`}></textarea>
      </div>

      {/* Terms and Conditions - Required for all users */}
      <div className="border-t border-gray-200 pt-6 mt-4">
        <div className="flex items-start">
          <input
            id="agreeToTerms"
            name="agreeToTerms"
            type="checkbox"
            checked={!!formData.agreeToTerms}
            onChange={handleChange}
            className="mt-1 h-4 w-4 text-ocean-600 border-gray-300 rounded focus-visible:ring-2 focus-visible:ring-ocean-500"
          />
          <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-700">
            I agree to the
            {' '}<a href="/terms-of-service?from=registration" target="_blank" rel="noopener noreferrer" className="text-ocean-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy-policy?from=registration" target="_blank" rel="noopener noreferrer" className="text-ocean-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded">Privacy Policy</a>.
          </label>
        </div>
        {errors.agreeToTerms && <p className={commonErrorClass}>{errors.agreeToTerms}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <a href="/" target="_self" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-ocean-600 hover:text-ocean-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Home
          </a>
        </div>
      </div>
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <a href="/" target="_self" rel="noopener noreferrer" className="flex items-center justify-center space-x-3 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" aria-label="Open AMET home page">
            <Logo className="h-12 w-auto" />
            <span className="text-2xl font-bold text-gray-900">AMET Alumni</span>
          </a>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Join the AMET Network</h2>
          <p className="mt-2 text-md text-gray-600">
            {currentStep === 1 && "Create your account to get started."}
            {currentStep === 2 && "Tell us more about yourself."}
          </p>
        </div>

        {/* QR quick access */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <img
                src="/QR.png"
                alt="Scan to register"
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Register via QR</p>
              <p className="text-xs text-slate-600">Scan on mobile to open this registration page.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            View full QR
          </button>
        </div>

        {renderStepIndicator()}

        {currentStep === 2 && (
          <div className="-mt-6 mb-2">
            <button
              type="button"
              onClick={() => { handlePrevious(); setTimeout(() => { const el = document.querySelector('form input, form select, form textarea'); if (el && typeof el.focus === 'function') el.focus(); }, 50); }}
              aria-label="Back to Step 1"
              className="inline-flex items-center text-sm font-medium text-ocean-600 hover:text-ocean-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </button>
          </div>
        )}

        <form onSubmit={currentStep === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} onKeyDown={handleFormKeyDown}>
          <div className="bg-white rounded-xl shadow-2xl p-6 md:p-10 space-y-8">
            {error && (
              <div className={`p-4 border rounded-lg text-sm ${error.toLowerCase().includes('successful') || error.toLowerCase().includes('submitted') || error.toLowerCase().includes('verify')
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-red-50 border-red-300 text-red-700'
              }`} role="alert">
                {error}
              </div>
            )}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}

            <div className="flex flex-col sm:flex-row pt-6 gap-4">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={isLoading}
                  className="w-full sm:w-auto flex-1 px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ocean-500 transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
              )}
              <button
                type={currentStep === 2 ? "submit" : "button"}
                onClick={currentStep < 2 ? handleNext : undefined}
                disabled={isLoading || showCompletionBanner}
                className="w-full sm:w-auto flex-1 px-6 py-3 bg-gradient-to-b from-ocean-500 to-ocean-600 text-white rounded-lg text-sm font-medium min-h-[44px] hover:from-ocean-600 hover:to-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ocean-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading && currentStep === 2 ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : currentStep < 2 ? 'Next' : 'Create Account'}
              </button>
            </div>
          </div>
        </form>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-ocean-600 hover:text-ocean-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {showCompletionBanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div
            role="status"
            aria-live="polite"
            className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Registration Completed</h3>
            <p className="mt-1 text-sm text-gray-600">Your profile is waiting for approval.</p>

            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-full animate-[progress_2.5s_linear_forwards] bg-green-500" />
            </div>
            <p className="mt-2 text-xs text-gray-500">Redirecting…</p>

            <button
              type="button"
              onClick={() => navigate(REDIRECT_AFTER_REGISTER, { replace: true })}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Go now
            </button>
          </div>

          {/* Tailwind keyframes for the progress bar */}
          <style>{`
            @keyframes progress { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          `}</style>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Logo className="h-10 w-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Registration Successful</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">Your account has been created. You can now sign in.</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:from-ocean-600 hover:to-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

      {showQr && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-full p-1"
              aria-label="Close QR"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Scan to Register</h3>
            <div className="flex justify-center">
              <img
                src="/QR.png"
                alt="Scan to register"
                className="w-72 h-72 object-contain"
              />
            </div>
            <p className="mt-3 text-center text-sm text-gray-600">
              Point your camera at the code to open this registration page on your device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedRegister;