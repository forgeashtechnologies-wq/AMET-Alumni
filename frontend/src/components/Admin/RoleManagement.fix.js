// Drop-in replacement function to render the role select dropdown with fallback options
const renderRoleOptions = (roles, defaultRole = 'user') => {
  // Default role options to use if no roles are found in the database
  const defaultRoles = [
    { name: 'super_admin', description: 'Super Administrator' },
    { name: 'admin', description: 'Administrator' },
    { name: 'moderator', description: 'Content Moderator' },
    { name: 'employer', description: 'Employer' },
    { name: 'alumni', description: 'AMET Alumni' },
    { name: 'student', description: 'Current Student' },
    { name: 'user', description: 'Standard User' }
  ];
  
  // Use roles from database if available, otherwise use defaults
  const rolesToUse = (roles && Array.isArray(roles) && roles.length > 0) ? roles : defaultRoles;
  
  return rolesToUse.map(role => (
    <option key={role.name} value={role.name}>
      {role.name} - {role.description || role.name}
    </option>
  ));
};

// Add this function to the RoleManagement component
// And replace all instances of roles.map with:
// {renderRoleOptions(roles, selectedUser?.role || 'user')}
