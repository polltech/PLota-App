// Role identifiers as returned by the backend /auth/me
export const ROLES = {
  FARMER:           'farmer',
  COOP_OFFICER:     'cooperative_officer',
  ADMIN:            'plotra_admin',
  REVIEWER:         'eudr_reviewer',
  DELIVERY_AGENT:   'delivery_agent',
  WASHING_STATION:  'washing_station',
  POST_HARVEST:     'post_harvest_officer',
  AGRONOMIST:       'agronomist',
  FINANCE_ADMIN:    'finance_admin',
};

export const STAFF_ROLE_OPTIONS = [
  {
    value: ROLES.DELIVERY_AGENT,
    label: 'Delivery / Weighing Agent',
    description: 'Records coffee cherry deliveries at the weighing station.',
    icon: 'scale-outline',
  },
  {
    value: ROLES.WASHING_STATION,
    label: 'Washing Station Officer',
    description: 'Manages deliveries, creates and processes wet-mill batches.',
    icon: 'water-outline',
  },
  {
    value: ROLES.POST_HARVEST,
    label: 'Post-Harvest Officer',
    description: 'Enters lab results — moisture, cup scores, grading — for batches.',
    icon: 'flask-outline',
  },
  {
    value: ROLES.AGRONOMIST,
    label: 'Agronomist / Field Officer',
    description: 'Validates farmer onboarding, farm data, and compliance documents.',
    icon: 'leaf-outline',
  },
  {
    value: ROLES.FINANCE_ADMIN,
    label: 'Finance & Admin',
    description: 'Manages consignments, export documentation, and payments.',
    icon: 'briefcase-outline',
  },
];

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
  [ROLES.COOP_OFFICER, ROLES.ADMIN, ROLES.DELIVERY_AGENT, ROLES.WASHING_STATION,
   ROLES.POST_HARVEST, ROLES.AGRONOMIST, ROLES.FINANCE_ADMIN].includes(user?.role);

// True for anyone who can use /admin/* endpoints
export const hasAdminAccess = (user) =>
  [ROLES.ADMIN, ROLES.REVIEWER].includes(user?.role);

export const roleLabel = (user) => {
  switch (user?.role) {
    case ROLES.FARMER:          return 'Farmer';
    case ROLES.COOP_OFFICER:    return 'Cooperative Officer';
    case ROLES.ADMIN:           return 'Platform Admin';
    case ROLES.REVIEWER:        return 'EUDR Reviewer';
    case ROLES.DELIVERY_AGENT:  return 'Delivery Agent';
    case ROLES.WASHING_STATION: return 'Washing Station Officer';
    case ROLES.POST_HARVEST:    return 'Post-Harvest Officer';
    case ROLES.AGRONOMIST:      return 'Agronomist';
    case ROLES.FINANCE_ADMIN:   return 'Finance & Admin';
    default: return user?.role || 'Unknown';
  }
};
