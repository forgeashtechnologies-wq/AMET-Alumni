import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../utils/supabase';
import { StarIcon } from '@heroicons/react/24/solid';
import ConnectionCTA from '../shared/ConnectionCTA';
import { TextPill } from '../shared/Chips';
import { useConnectionRel } from '../../hooks/useConnectionRel';
import { useAuth } from '../../contexts/AuthContext';
import MentorContactPanel from '../Mentorship/MentorContactPanel';
import Avatar from '../common/Avatar';
import { useAcademicsCatalog } from '../../hooks/useAcademicsCatalog';
import { useProfileAchievements } from '../../hooks/useProfileAchievements';
import { loadProfileSocialLinks } from '../../services/socialLinks';
import useProfileContact from '../../hooks/useProfileContact';
import { canViewContact } from '../../utils/contactPermissions';
import LockedContactInfo from './LockedContactInfo';
import ContactInfo from './ContactInfo';
import { formatBatchLabel } from '../../utils/batchYear';
import logger from '../../utils/logger';
import { useAvatar } from '../../hooks/useAvatar';

const AchievementCard = ({ achievement }) => (
  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <StarIcon className="w-6 h-6 text-yellow-500" aria-hidden="true" />
      </div>
      <div className="ml-3">
        <p className="text-md font-semibold text-slate-900">{achievement.title || achievement}</p>
        {achievement.description && <p className="text-sm text-slate-600 mt-1">{achievement.description}</p>}
      </div>
    </div>
  </div>
);

const AlumniProfile = () => {
  const { id, jobId } = useParams();
  const navigate = useNavigate();
  const [alumnus, setAlumnus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  // Connection rel (live)
  const rel = useConnectionRel(currentUser?.id, id);
  const { getUserRole } = useAuth();
  const role = getUserRole?.();
  const { degrees, groups } = useAcademicsCatalog();
  const contact = useProfileContact(alumnus?.id);
  const { avatarUrl } = useAvatar(id, { useSignedUrl: true, autoFetch: !!id });
  // Load public achievements for this profile via RPC (works for any viewer)
  const { achievements: achievementsList = [], isLoading: achievementsLoading } = useProfileAchievements(id);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
    };
    getCurrentUser();

    const fetchAlumnusData = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        let row = null;

        if (jobId) {
          // Employer/admin viewing an applicant from Manage Applications.
          // Use secure RPC that enforces job ownership + application existence.
          const { data, error: rpcError } = await supabase.rpc('get_applicant_profile_for_job', {
            p_job_id: jobId,
            p_applicant_id: id,
          });

          if (rpcError || !data) {
            setError("This profile isn’t available in the context of this job.");
            if (rpcError) {
              logger.error('Error fetching applicant via get_applicant_profile_for_job:', rpcError);
            }
            return;
          }
          row = data;
        } else {
          // Normal directory flow: use directory_profiles_public view
          const { data, error: supabaseError } = await supabase
            .from('directory_profiles_public')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (supabaseError || !data) {
            setError('This profile isn’t publicly visible.');
            if (supabaseError) {
              logger.error('Error fetching alumni from directory_profiles_public:', supabaseError);
            }
            return;
          }
          row = data;
        }
        const data = row;

        logger.log('Fetched alumni profile:', data);

        // Experience data comes from the directory view as work_experience (with
        // a possible legacy fallback to experience). Normalize it once so the
        // rest of the component can rely on alumnus.experience / experience_text.
        const rawExperience =
          typeof data.work_experience !== 'undefined' && data.work_experience !== null
            ? data.work_experience
            : data.experience;

        const city = data.location_city || '';
        const country = data.location_country || '';
        const location =
          data.location ||
          [city, country].filter(Boolean).join(', ') ||
          'Not specified';

        const nameFromParts = `${(data.first_name || '').trim()} ${(data.last_name || '').trim()}`.trim();
        const name = (data.full_name || '').trim() || nameFromParts || 'Unknown';

        // Education: prefer structured list from v_profile_degrees_education when available,
        // fall back to any education array projected by the directory view.
        let education = Array.isArray(data.education) ? data.education : [];
        try {
          const { data: degreesRow, error: degreesError } = await supabase
            .from('v_profile_degrees_education')
            .select('education')
            .eq('profile_id', id)
            .maybeSingle();

          if (!degreesError && Array.isArray(degreesRow?.education)) {
            // Normalize keys to match AlumniProfile expectations
            education = degreesRow.education.map((deg) => ({
              degree: deg.degree,
              institution: deg.institution,
              department: deg.department ?? deg.institution ?? null,
              year: deg.year,
              grade: deg.grade ?? null,
              is_primary: deg.is_primary ?? false,
            }));
          }
        } catch (degreesErr) {
          logger.error('Error loading directory education from v_profile_degrees_education:', degreesErr);
        }

        // Helper: parse legacy combined degree_department text into degree/department parts
        const parseDegreeDepartment = (labelRaw) => {
          if (!labelRaw) return { degree: null, department: null };
          const label = String(labelRaw);
          const byComma = label.split(',').map(s => s.trim());
          if (byComma.length >= 2) {
            return { degree: byComma[0] || null, department: byComma.slice(1).join(', ') || null };
          }
          const byDash = label.split(' - ').map(s => s.trim());
          if (byDash.length >= 2) {
            return { degree: byDash[0] || null, department: byDash.slice(1).join(' - ') || null };
          }
          const upper = label.toUpperCase();
          const KNOWN = ['BBA','BCA','BE','BSC','BTECH','MBA','MCA','ME','MSC','MTECH','PHD'];
          if (KNOWN.includes(upper)) return { degree: label, department: null };
          return { degree: null, department: label };
        };

        const transformed = {
          id: data.id,
          name,
          // Use COALESCE logic matching backend view
          graduationYear: data.graduation_year ?? data.expected_graduation_year ?? data.batch_year ?? null,
          // Degree/department: prefer structured fields, then legacy degree_department split
          degreeLabel: data.degree_program ?? data.degree ?? null,
          departmentLabel: data.department ?? data.degree_department ?? null,
          degree_department: data.degree_department || null,
          currentPosition: data.current_job_title ?? data.current_position ?? 'Not specified',
          company: data.company_name ?? 'Not specified',
          location,
          avatar: data.avatar_url || null,
          coverImage: data.cover_image || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=300&fit=crop',
          verified: data.is_verified || false,
          joinedDate: data.created_at
            ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : '',
          about: data.about || '',
          // Prefer structured experience when available, but preserve the plain-text
          // experience string from Profile settings so it can still be shown.
          experience: Array.isArray(rawExperience) ? rawExperience : [],
          experience_text:
            !Array.isArray(rawExperience) && typeof rawExperience === 'string'
              ? rawExperience
              : '',
          education,
          skills: Array.isArray(data.skills) ? data.skills : [],
          achievements: Array.isArray(data.achievements)
            ? data.achievements
            : typeof data.achievements === 'string'
              ? [data.achievements]
              : [],
          interests: Array.isArray(data.interests) ? data.interests : [],
          languages: Array.isArray(data.languages) ? data.languages : [],
          socialLinks: {},
          updated_at: data.updated_at || null,
          degree_code: data.degree_code || null,
          department_id: data.department_id || null,
        };

        // If degree/department still missing, parse combined degree_department string
        if ((!transformed.degreeLabel || !transformed.departmentLabel) && data.degree_department) {
          const parsed = parseDegreeDepartment(data.degree_department);
          transformed.degreeLabel = transformed.degreeLabel || parsed.degree;
          transformed.departmentLabel = transformed.departmentLabel || parsed.department;
        }

        // If primary degree isn't populated on the profile, derive it from the education list
        const primaryDegree = Array.isArray(education)
          ? education.find((e) => e.is_primary) || education[0]
          : null;
        if (primaryDegree) {
          if (!transformed.degreeLabel && primaryDegree.degree) {
            transformed.degreeLabel = primaryDegree.degree;
          }
          if (!transformed.departmentLabel && primaryDegree.institution) {
            transformed.departmentLabel = primaryDegree.institution;
          }
          if (!transformed.graduationYear && primaryDegree.year) {
            transformed.graduationYear = primaryDegree.year;
          }
        }

        // If the directory view doesn't yet project any work_experience but the
        // core profile has a simple experience string, load it as a fallback so
        // users still see what they entered in Profile settings.
        try {
          if (
            Array.isArray(rawExperience) &&
            rawExperience.length === 0 &&
            !transformed.experience_text
          ) {
            const { data: profileRow, error: profileErr } = await supabase
              .from('profiles')
              .select('experience')
              .eq('id', id)
              .maybeSingle();

            if (!profileErr && profileRow && typeof profileRow.experience === 'string') {
              transformed.experience_text = profileRow.experience;
            }
          }
        } catch (expErr) {
          logger.error('Error loading fallback experience from profiles:', expErr);
        }

        const socialLinks = await loadProfileSocialLinks(id);
        const mergedSocialLinks = {
          ...socialLinks,
          ...(data.linkedin_url && !socialLinks?.linkedin ? { linkedin: data.linkedin_url } : {}),
        };

        setAlumnus({ ...transformed, socialLinks: mergedSocialLinks });
      } catch (err) {
        logger.error('An unexpected error occurred:', err);
        setError("This profile isn’t publicly visible.");
      } finally {
        setLoading(false);
      }
    };

    fetchAlumnusData();
  }, [id]);

  // Compute degree/department labels from catalog (or fallback to existing) whenever data changes
  useEffect(() => {
    if (!alumnus) return;
    // derive primary education fallback
    const primaryEdu = Array.isArray(alumnus.education) && alumnus.education.length > 0
      ? (alumnus.education.find(e => e.is_primary) || alumnus.education[0])
      : null;

    // parse combined degree_department if present
    const parseDegreeDepartment = (labelRaw) => {
      if (!labelRaw) return { degree: null, department: null };
      const label = String(labelRaw);
      const byComma = label.split(',').map(s => s.trim());
      if (byComma.length >= 2) {
        return { degree: byComma[0] || null, department: byComma.slice(1).join(', ') || null };
      }
      const byDash = label.split(' - ').map(s => s.trim());
      if (byDash.length >= 2) {
        return { degree: byDash[0] || null, department: byDash.slice(1).join(' - ') || null };
      }
      const upper = label.toUpperCase();
      const KNOWN = ['BBA','BCA','BE','BSC','BTECH','MBA','MCA','ME','MSC','MTECH','PHD'];
      if (KNOWN.includes(upper)) return { degree: label, department: null };
      return { degree: null, department: label };
    };

    const code = alumnus.degree_code;
    const depId = alumnus.department_id;
    const foundDegree = code ? degrees.find(d => d.degree_code === code) : null;
    const parsed = parseDegreeDepartment(alumnus.degree_department);

    const degreeLabel =
      foundDegree?.degree_label
      || alumnus.degreeLabel
      || parsed.degree
      || (primaryEdu?.degree || null)
      || (code ? String(code).toUpperCase() : null);

    let departmentLabel =
      alumnus.departmentLabel
      || parsed.department
      || primaryEdu?.institution
      || primaryEdu?.department
      || null;

    const group = code ? (groups.find(g => g.degree_code === code) || null) : null;
    if (group && depId) {
      const dep = (group.departments || []).find(d => d.id === depId);
      if (dep) departmentLabel = dep.name;
    }

    setAlumnus(prev => prev ? { ...prev, degreeLabel: degreeLabel || prev.degreeLabel, departmentLabel: departmentLabel || prev.departmentLabel } : prev);
  }, [alumnus?.id, alumnus?.degree_code, alumnus?.department_id, alumnus?.education, alumnus?.degreeLabel, alumnus?.departmentLabel, alumnus?.degree_department, degrees, groups]);

  const handleMessage = () => {
    if (!currentUser || !alumnus) return;
    navigate(`/messages?peer=${alumnus.id}`);
  };
  
  // Close avatar lightbox on Escape key
  useEffect(() => {
    if (!isAvatarOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAvatarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAvatarOpen]);
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600 mb-4" aria-hidden="true"></div>
        <p className="text-slate-600">Loading alumni profile...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-red-500 text-5xl mb-4" aria-hidden="true">⚠️</div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Profile Not Found</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <button 
          type="button"
          onClick={() => navigate('/directory')} 
          className="btn-ocean px-6 py-2.5 min-h-[44px] rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
        >
          Back to Directory
        </button>
      </div>
    );
  }
  
  if (!alumnus) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-slate-500 text-5xl mb-4" aria-hidden="true">🔍</div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Profile Not Available</h2>
        <p className="text-slate-600 mb-6">The requested alumni profile could not be found.</p>
        <button 
          type="button"
          onClick={() => navigate('/directory')} 
          className="btn-ocean px-6 py-2.5 min-h-[44px] rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
        >
          Back to Directory
        </button>
      </div>
    );
  }
  const headlineRaw = [alumnus.currentPosition, alumnus.company].filter(Boolean).join(' at ');
  const hasHeadline = Boolean(headlineRaw && !/Not specified/i.test(headlineRaw));
  const metaChips = [
    alumnus.degreeLabel || (alumnus.degree_code ? String(alumnus.degree_code).toUpperCase() : null),
    alumnus.departmentLabel || null,
    alumnus.graduationYear ? formatBatchLabel(alumnus.graduationYear) : null,
    alumnus.location && alumnus.location !== 'Not specified' ? alumnus.location : null,
  ].filter(Boolean);
  // Build education list with primary-first ordering
  const educationList = (() => {
    const list = Array.isArray(alumnus.education) ? [...alumnus.education] : [];
    const hasPrimary = list.some(e => e.is_primary);
    if (!hasPrimary && (alumnus.degreeLabel || alumnus.degree_code)) {
      list.unshift({
        degree: alumnus.degreeLabel || (alumnus.degree_code ? String(alumnus.degree_code).toUpperCase() : 'Degree'),
        institution: alumnus.departmentLabel || null,
        year: alumnus.graduationYear || null,
        grade: null,
        is_primary: true,
      });
    }
    return list.sort((a, b) => (b.is_primary === true) - (a.is_primary === true));
  })();
  // Avatar precedence: prefer signed URL from useAvatar, fall back to view/avatar field
  const avatarSrc = avatarUrl || alumnus?.avatar || null;
  return (
  <React.Fragment>
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-sky-50/70 via-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
        {/* Centered Header */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 border border-slate-200 shadow-sm shadow-slate-100 backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-ocean-500/10 via-ocean-400/10 to-sky-400/10 pointer-events-none" />
          <div className="relative z-10 px-6 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-7 flex flex-col items-center text-center space-y-4">
            {/* Profile Picture */}
            <div className="relative mb-1">
              <button
                type="button"
                onClick={() => avatarSrc && setIsAvatarOpen(true)}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 cursor-zoom-in"
                aria-label="View profile picture in full screen"
              >
                <Avatar
                  src={avatarSrc}
                  alt={`${alumnus.name}'s profile picture`}
                  size={96}
                  version={alumnus.updated_at}
                  className="ring-2 ring-ocean-500/70 shadow-md"
                  loading="eager"
                />
              </button>
            </div>
            {/* Basic Info */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {alumnus.name}
              </h1>
              {hasHeadline && (
                <p className="text-sm sm:text-base text-slate-600">
                  {headlineRaw}
                </p>
              )}
            </div>
            {/* Meta chips row (degree, department, batch, location) */}
            {metaChips.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {metaChips.map((label, idx) => (
                  <TextPill key={idx} size="sm">
                    {label}
                  </TextPill>
                ))}
              </div>
            )}
            {/* CTA: shared, scope=profile */}
            {currentUser && currentUser.id !== alumnus.id && (
              <div className="pt-1">
                <ConnectionCTA
                  meId={currentUser?.id}
                  peerId={alumnus.id}
                  rel={rel}
                  scope="profile"
                  onMessage={handleMessage}
                />
              </div>
            )}

            {/* Chips intentionally hidden on Profile header per spec; kept only on Directory cards */}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">About</h2>
              <p className="text-slate-700 leading-relaxed">{alumnus.about || 'No biography provided.'}</p>
            </div>

            {/* Experience */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Experience</h2>
              <div className="space-y-6">
                {Array.isArray(alumnus.experience) && alumnus.experience.length > 0 ? (
                  alumnus.experience.map((exp, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-ocean-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                        <BriefcaseIcon className="w-5 h-5 text-white" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{exp.position}</h3>
                        <p className="text-ocean-600 font-medium">{exp.company}</p>
                        <p className="text-sm text-slate-600">{exp.duration} 􏿾f {exp.location}</p>
                        <p className="text-slate-700 mt-2">{exp.description}</p>
                      </div>
                    </div>
                  ))
                ) : alumnus.experience_text && alumnus.experience_text.trim() ? (
                  <p className="text-slate-700 whitespace-pre-wrap">{alumnus.experience_text}</p>
                ) : (
                  <p className="text-slate-500">No experience information available.</p>
                )}
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Education</h2>
              <div className="space-y-4">
                {educationList.length > 0 ? (
                  <ol className="space-y-3 list-none p-0 m-0" aria-label="Education history">
                    {educationList.map((edu, index) => {
                      const hasYear = !!edu.year;
                      const hasGrade = !!edu.grade;
                      let metaLine = '';
                      if (hasYear && hasGrade) {
                        metaLine = `${edu.year} · ${edu.grade}`;
                      } else if (hasYear) {
                        metaLine = `Class of ${edu.year}`;
                      } else if (hasGrade) {
                        metaLine = String(edu.grade);
                      }
                      const deptLine =
                        edu.institution ||
                        edu.department ||
                        alumnus.departmentLabel ||
                        null;
                      return (
                        <li
                          key={index}
                          className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"
                        >
                          <div className="w-10 h-10 bg-slate-100 ring-1 ring-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <AcademicCapIcon className="w-5 h-5 text-slate-600" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            {edu.degree && (
                              <h3 className="font-semibold text-slate-900">{edu.degree}</h3>
                            )}
                            {deptLine && (
                              <p className="text-ocean-600 font-medium">{deptLine}</p>
                            )}
                            {metaLine && (
                              <p className="text-sm text-slate-600 mt-1">{metaLine}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (alumnus.degreeLabel || alumnus.degree_code || alumnus.departmentLabel || alumnus.graduationYear) ? (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-slate-100 ring-1 ring-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AcademicCapIcon className="w-5 h-5 text-slate-600" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{alumnus.degreeLabel || (alumnus.degree_code ? String(alumnus.degree_code).toUpperCase() : 'Not specified')}</h3>
                      <p className="text-ocean-600 font-medium">{alumnus.departmentLabel || ''}</p>
                      <p className="text-sm text-slate-600">{alumnus.graduationYear ? `Batch ${alumnus.graduationYear}` : ''}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">No education information available.</p>
                )}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Key Achievements</h2>
              {achievementsLoading ? (
                <p className="text-slate-500 text-sm">Loading achievements...</p>
              ) : (Array.isArray(achievementsList) && achievementsList.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievementsList.map((achievement, index) => (
                    <AchievementCard key={achievement.id || index} achievement={achievement} />
                  ))}
                </div>
              ) : (Array.isArray(alumnus.achievements) && alumnus.achievements.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alumnus.achievements.map((achievement, index) => (
                    <AchievementCard key={index} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No achievements added yet.</p>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Contact Info (email/phone only when backend RPC allows) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <BriefcaseIcon className="w-6 h-6 mr-4 text-ocean-600" aria-hidden="true" />
                  <div>
                    <div className="text-sm text-gray-500">Currently</div>
                    <div className="font-medium">{alumnus.currentPosition} at {alumnus.company}</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <MapPinIcon className="w-6 h-6 mr-4 text-ocean-600" aria-hidden="true" />
                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-medium">{alumnus.location}</div>
                  </div>
                </div>
                {contact.loading ? (
                  <p className="text-sm text-slate-500">Loading contact details...</p>
                ) : !canViewContact(contact) ? (
                  <LockedContactInfo />
                ) : (
                  <ContactInfo email={contact.email} phone_number={contact.phone_number} />
                )}
              </div>
            </div>

            {/* Mentor contact unlock panel for students */}
            {role === 'student' && <MentorContactPanel mentorId={alumnus.id} />}

            {/* Skills */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(alumnus.skills) && alumnus.skills.length > 0 ? (
                  alumnus.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-ocean-100 text-ocean-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No skills listed.</p>
                )}
              </div>
            </div>

            {/* Social Links (safe to show for all roles) */}
            {(
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Social Links</h3>
                <div className="space-y-2">
                  {alumnus.socialLinks && Object.values(alumnus.socialLinks).some(link => link) ? (
                    Object.entries(alumnus.socialLinks).map(([platform, url]) => (
                      url && (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-ocean-600 hover:text-ocean-700 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-1 rounded"
                        >
                          <LinkIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </a>
                      )
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No social links provided.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {avatarSrc && isAvatarOpen && (
      <div
        className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Enlarged profile picture"
        onClick={() => setIsAvatarOpen(false)}
      >
        <div
          className="relative w-[90vw] sm:w-[70vw] md:w-[55vw] max-w-3xl max-h-[80vh] bg-black/40 sm:bg-black/20 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsAvatarOpen(false)}
            className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white text-sm font-semibold hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
            aria-label="Close enlarged profile picture"
          >
            ×
          </button>
          <img
            src={avatarSrc}
            alt={`${alumnus.name}'s profile picture`}
            className="max-h-[70vh] max-w-[80vw] sm:max-w-[60vw] md:max-w-[50vw] object-contain rounded-xl"
          />
        </div>
      </div>
    )}
  </React.Fragment>
);
};

export default AlumniProfile;