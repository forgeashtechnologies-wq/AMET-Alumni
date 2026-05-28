// components/Mentorship/MentorContactPanel.js
import { useEffect, useState } from 'react';
import { fetchMentorContact } from '../../services/directoryApi';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function MentorContactPanel({ mentorId }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('checking'); // 'locked' | 'unlocked' | 'checking'
  const [contact, setContact] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function checkAndLoad() {
      setStatus('checking');
      setErr(null);

      // Ensure this user is an approved mentor; otherwise show nothing
      const { data: mentorRow } = await supabase
        .from('mentors')
        .select('user_id, status')
        .eq('user_id', mentorId)
        .eq('status', 'approved')
        .maybeSingle();

      if (!mentorRow) {
        if (!ignore) setStatus('none');
        return;
      }

      // Is there an accepted request or relationship?
      const { data: rel1 } = await supabase
        .from('mentorship_requests')
        .select('id,status')
        .eq('mentor_id', mentorId)
        .eq('mentee_id', user?.id)
        .eq('status', 'accepted')
        .limit(1);

      const { data: rel2 } = await supabase
        .from('mentorship_relationships')
        .select('id,status')
        .eq('mentor_id', mentorId)
        .eq('mentee_id', user?.id)
        .in('status', ['active', 'accepted'])
        .limit(1);

      const isAccepted = (rel1 && rel1.length) || (rel2 && rel2.length);

      if (!isAccepted) {
        if (!ignore) setStatus('locked');
        return;
      }

      try {
        const c = await fetchMentorContact(mentorId);
        if (!ignore) {
          setContact(c);
          setStatus('unlocked');
        }
      } catch (e) {
        if (!ignore) {
          setErr('Contact details become available after your mentorship is accepted.');
          setStatus('locked');
        }
      }
    }

    if (mentorId && user?.id) checkAndLoad();
    return () => { ignore = true; };
  }, [mentorId, user?.id]);

  if (status === 'checking') return <div className="text-sm opacity-70">Checking mentorship status…</div>;
  if (status === 'none') return null;

  if (status === 'locked')
    return (
      <div className="alert alert-info">
        <div>
          Mentor contact unlocks after your mentorship is accepted.
          <a href={`/mentorship/mentor/${mentorId}`} className="link ml-1">Request mentorship</a>
        </div>
        {err && <div className="text-error text-xs mt-1">{err}</div>}
      </div>
    );

  // unlocked – only show card if a meeting link is actually set
  if (!contact?.default_meeting_link) return null;

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="font-semibold">Mentor Contact</div>
        <div className="text-sm">
          <a className="link" href={contact.default_meeting_link} target="_blank" rel="noreferrer">
            Meeting Link
          </a>
        </div>
      </div>
    </div>
  );
}
