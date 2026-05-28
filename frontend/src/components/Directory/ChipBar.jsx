import React, { useEffect, useRef, useState } from 'react';

export default function ChipBar({ counts, active, onChange, showEmployers = false, showConnections = false }) {
  const [openMenu, setOpenMenu] = useState(null); // 'roles' | 'connections' | null
  const containerRef = useRef(null);

  // Close any open dropdown when clicking anywhere outside the chip bar
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!openMenu) return; // nothing open
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    // Use capture phase so we fire even if inner elements stop propagation
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [openMenu]);

  const roleItems = [
    { id: 'alumni', label: 'Alumni', count: counts?.alumni, breakdown: counts?.alumniBreakdown },
    { id: 'students', label: 'Students', count: counts?.students, breakdown: counts?.studentBreakdown },
  ];
  if (showEmployers) {
    roleItems.push({ id: 'employers', label: 'Employers', count: counts?.employers, breakdown: counts?.employerBreakdown });
  }

  const connectionItems = showConnections
    ? [
        { id: 'connected', label: 'Connections', count: counts?.connected ?? 0 },
        { id: 'received', label: 'Requests received', count: counts?.received ?? 0 },
        { id: 'sent', label: 'Requests sent', count: counts?.sent ?? 0 },
      ]
    : [];

  const isRolesActive = roleItems.some(item => item.id === active);
  const isMyConnectionsActive = connectionItems.some(item => item.id === active);

  const handleSelect = (id) => {
    onChange(id);
    setOpenMenu(null);
  };

  const GroupChip = ({
    groupId,
    label,
    items,
    isActive,
    activeLeafId,
  }) => {
    if (!items || items.length === 0) return null;

    const isOpen = openMenu === groupId;
    const selectedItem = items.find(i => i.id === activeLeafId) || items[0];

    // Use solid white chips for both active and inactive states so the
    // "My Connections" chip doesn't look greyed out against the gradient.
    const baseClasses = isActive
      ? 'bg-white text-ocean-700 border-white shadow-lg'
      : 'bg-white text-slate-700 border-white hover:shadow-md hover:text-ocean-700';

    return (
      <div className="relative inline-flex items-stretch">
        <button
          type="button"
          aria-pressed={isActive}
          aria-expanded={isOpen}
          className={`min-h-[40px] px-5 py-2 rounded-xl border-2 font-semibold text-sm flex items-center gap-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ocean-600 ${baseClasses}`}
          onClick={() => setOpenMenu(isOpen ? null : groupId)}
        >
          <span>{label}</span>
          <span className={`text-xs font-medium ${isActive ? 'text-ocean-600' : 'text-slate-600'}`}>
            {/* show current selection label inside the chip */}
            {selectedItem.label}
          </span>
          <span className={`ml-1 text-xs ${isActive ? 'text-ocean-600' : 'text-slate-500'}`}>
            ▾
          </span>
        </button>
        <div
          className={`absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-2xl transform origin-top transition-all duration-150 z-30 ${
            isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <ul className="py-1 text-sm text-slate-700">
            {items.map(item => {
              const itemActive = item.id === activeLeafId;
              const bd = item.breakdown && typeof item.breakdown === 'object' ? item.breakdown : null;
              const hasBd = !!(bd && ('approved' in bd || 'pending' in bd || 'rejected' in bd || 'total' in bd));
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors rounded-lg ${
                      itemActive ? 'bg-ocean-50 text-ocean-700 font-semibold' : ''
                    }`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <span className="flex flex-col">
                      <span>{item.label}</span>
                      {hasBd && (
                        <span className={`mt-0.5 text-[11px] ${itemActive ? 'text-ocean-700/90' : 'text-slate-500'}`}>
                          Approved: {Number(bd.approved || 0)} · Pending: {Number(bd.pending || 0)} · Rejected: {Number(bd.rejected || 0)}
                        </span>
                      )}
                    </span>
                    {typeof item.count === 'number' && (
                      <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${itemActive ? 'bg-ocean-200 text-ocean-800' : 'bg-slate-200 text-slate-700'}`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-wrap gap-3 items-center">
      {/* Roles group: Alumni / Students / Employers */}
      <GroupChip
        groupId="roles"
        label="Members"
        items={roleItems}
        isActive={isRolesActive}
        activeLeafId={active}
      />
      {/* Connections section: single dropdown under "My Connections" (admin only) */}
      {showConnections && (
        <GroupChip
          groupId="connections"
          label="My Connections"
          items={connectionItems}
          isActive={isMyConnectionsActive}
          activeLeafId={active}
        />
      )}
    </div>
  );
}
