// Role identifiers as returned by the backend /auth/me
export const ROLES = {
  FARMER: 'farmer',
  COOP_OFFICER: 'cooperative_officer',
  ADMIN: 'plotra_admin',
  REVIEWER: 'eudr_reviewer',
};

export const isCoopOfficer = (user) =>
  user?.role === ROLES.COOP_OFFICER;

export const isAdmin = (user) =>
  user?.role === ROLES.ADMIN;

export const isReviewer = (user) =>
  user?.role === ROLES.REVIEWER;

export const isFarmer = (user) =>
  !user?.role || user?.role === ROLES.FARMER;

// True for anyone who can use /coop/* endpoints
export const hasCoopAccess = (user) =>
  [ROLES.COOP_OFFICER, ROLES.ADMIN].includes(user?.role);

// True for anyone who can use /admin/* endpoints
export const hasAdminAccess = (user) =>
  [ROLES.ADMIN, ROLES.REVIEWER].includes(user?.role);

export const roleLabel = (user) => {
  switch (user?.role) {
    case ROLES.FARMER: return 'Farmer';
    case ROLES.COOP_OFFICER: return 'Cooperative Officer';
    case ROLES.ADMIN: return 'Platform Admin';
    case ROLES.REVIEWER: return 'EUDR Reviewer';
    default: return user?.role || 'Unknown';
  }
};
