// Use centralized roles from utils/roles (lib may be ignored in some deploys)
import { ROLE_OPTIONS, isRole as _isRole } from '../utils/roles';

export const ROLES = ROLE_OPTIONS.map(r => r.value);
export const isRole = (v) => _isRole(v);
