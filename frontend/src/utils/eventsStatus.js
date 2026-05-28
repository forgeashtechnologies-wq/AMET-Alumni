import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// Ensure all comparisons are performed in UTC to avoid timezone drift
dayjs.extend(utc);

// Central helper to compute event timing flags and status label
// This mirrors existing frontend semantics for start/end and status
export function computeEventTimelineFlags(event) {
  if (!event) {
    return {
      startISO: null,
      endISO: null,
      eventStarted: false,
      eventEnded: false,
      statusLabel: 'Upcoming',
    };
  }

  // Always compare using UTC to avoid local timezone affecting status
  const now = dayjs.utc();

  const startISO = event.start_at || event.start_date || null;
  const endISO = event.computed_end_at || event.end_at || event.end_date || startISO;

  const start = startISO ? dayjs.utc(startISO) : null;
  const end = endISO ? dayjs.utc(endISO) : start;

  const eventStarted = (!!start && (now.isAfter(start) || now.isSame(start)));
  // Treat end time as inclusive: an event is ended when now >= end
  const eventEnded = (!!end && (now.isAfter(end) || now.isSame(end)));

  let statusLabel = 'Upcoming';
  if (eventEnded) statusLabel = 'Past';
  else if (eventStarted) statusLabel = 'Happening Now';

  return {
    startISO,
    endISO,
    eventStarted,
    eventEnded,
    statusLabel,
  };
}
