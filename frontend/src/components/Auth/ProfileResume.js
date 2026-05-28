import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { 
  DocumentIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

// Normalize resume value (path or legacy public URL) into a storage path
const getResumePathFromValue = (value) => {
  if (!value) return null;

  // New style: plain key/path like "userId/uuid-file.pdf"
  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  // Legacy style: full public URL containing "/storage/v1/object/public/resumes/<key>"
  const match = value.match(/\/storage\/v1\/object\/public\/resumes\/(.+)$/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
};

const ProfileResume = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];

      const enriched = await Promise.all(rows.map(async (row) => {
        const out = { ...row };
        try {
          const path = getResumePathFromValue(row.file_url || '');
          if (path) {
            const { data: signed, error: signErr } = await supabase
              .storage
              .from('resumes')
              .createSignedUrl(path, 60 * 60);
            if (!signErr && signed?.signedUrl) {
              out._signedUrl = signed.signedUrl;
            }
          }
        } catch (_) { /* ignore */ }
        return out;
      }));

      setResumes(enriched);
    } catch (error) {
      logger.error('Error fetching resumes:', error);
      toast.error('Failed to load your resumes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and Word documents are allowed');
      e.target.value = ''; // Clear the file input
      return;
    }

    // Check file size (3MB limit)
    if (file.size > 3 * 1024 * 1024) {
      toast.error('File size exceeds 3MB limit');
      e.target.value = ''; // Clear the file input
      return;
    }

    try {
      setUploadingResume(true);
      
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const storagePath = uploadData?.path || filePath;

      // Save resume metadata to database
      const resumeData = {
        user_id: user.id,
        file_url: storagePath,
        file_path: storagePath, // ensure NOT NULL file_path is populated
        filename: file.name,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
        is_primary: resumes.length === 0 // Make this primary if it's the first resume
      };
      
      // Log the structure we're trying to insert
      logger.log("Inserting resume data:", resumeData);

      const { data: insertData, error: insertError } = await supabase
        .from('user_resumes')
        .insert([resumeData])
        .select();

      if (insertError) throw insertError;

      toast.success('Resume uploaded successfully');
      fetchResumes(); // Refresh the list
      e.target.value = ''; // Clear the file input
      
    } catch (error) {
      logger.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSetPrimary = async (resumeId) => {
    try {
      // First, set all resumes to non-primary
      await supabase
        .from('user_resumes')
        .update({ is_primary: false })
        .eq('user_id', user.id);
      
      // Then set the selected resume as primary
      const { error } = await supabase
        .from('user_resumes')
        .update({ is_primary: true })
        .eq('id', resumeId);
      
      if (error) throw error;
      
      toast.success('Primary resume updated');
      fetchResumes(); // Refresh the list
    } catch (error) {
      logger.error('Error setting primary resume:', error);
      toast.error('Failed to update primary resume');
    }
  };

  const handleDeleteResume = async (resumeId, fileUrl) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    
    try {
      // Normalize to a storage path from either a path or legacy public URL
      const filePath = getResumePathFromValue(fileUrl);

      if (filePath) {
        // Delete file from storage
        const { error: storageError } = await supabase.storage
          .from('resumes')
          .remove([filePath]);
        
        if (storageError) logger.error('Error deleting file from storage:', storageError);
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from('user_resumes')
        .delete()
        .eq('id', resumeId);
      
      if (dbError) throw dbError;
      
      toast.success('Resume deleted successfully');
      fetchResumes(); // Refresh the list
    } catch (error) {
      logger.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6 relative">
        <h2 className="text-xl font-semibold mb-4">My Resumes</h2>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 relative">
      <h2 className="text-xl font-semibold mb-4">My Resumes</h2>
      
      {/* Upload New Resume */}
      <div className="mb-6">
        <label 
          htmlFor="resume-upload" 
          className={`flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg ${uploadingResume ? 'opacity-70 pointer-events-none' : ''} ${resumes.length > 0 ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
        >
          <div className="text-center">
            <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {uploadingResume ? 'Uploading...' : (resumes.length > 0 ? 'Only one resume allowed. Delete existing to upload a new one' : 'Click to upload a new resume')}
            </p>
            <p className="mt-1 text-xs text-gray-500">PDF or Word documents, max 3MB</p>
          </div>
          <input
            id="resume-upload"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              if (resumes.length > 0) {
                toast.error('Only one resume allowed. Please delete the existing resume first.');
                e.target.value = '';
                return;
              }
              handleFileChange(e);
            }}
            disabled={uploadingResume || resumes.length > 0}
          />
        </label>
      </div>
      
      {/* Resume List */}
      {resumes.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No resumes uploaded yet</p>
          <p className="text-sm text-gray-400">Upload your resume to apply for jobs easily</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resumes.map(resume => (
            <div key={resume.id} className={`p-4 rounded-lg border ${resume.is_primary ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <DocumentIcon className="h-6 w-6 text-gray-500 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800">{resume.filename}</p>
                    <div className="flex flex-wrap text-xs text-gray-500 mt-1">
                      <span className="mr-3">Uploaded: {formatDate(resume.uploaded_at)}</span>
                      <span>{formatFileSize(resume.file_size)}</span>
                      {resume.is_primary && (
                        <span className="ml-3 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {resume._signedUrl ? (
                    <a 
                      href={resume._signedUrl} 
                      download={resume.filename}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                      title="Download Resume"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                    </a>
                  ) : (
                    <span className="p-1.5 text-gray-400" title="Resume file unavailable">
                      <DocumentArrowDownIcon className="h-5 w-5" />
                    </span>
                  )}
                  {!resume.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(resume.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-gray-100 rounded-full"
                      title="Set as Primary Resume"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteResume(resume.id, resume.file_url)}
                    className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-gray-100 rounded-full"
                    title="Delete Resume"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileResume;
