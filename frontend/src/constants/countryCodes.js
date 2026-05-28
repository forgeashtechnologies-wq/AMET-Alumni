// Centralized country calling codes and basic metadata for phone inputs.
// NOTE: This is a curated list of major country/region calling codes.
// If you need to support additional territories, extend COUNTRY_CODE_OPTIONS.

export const COUNTRY_CODE_OPTIONS = [
  // Core markets
  { code: '+91', iso2: 'IN', name: 'India', label: 'India (+91)', localMin: 10, localMax: 10 },
  { code: '+971', iso2: 'AE', name: 'United Arab Emirates', label: 'United Arab Emirates (+971)', localMin: 8, localMax: 9 },
  { code: '+1', iso2: 'US', name: 'United States / Canada', label: 'United States / Canada (+1)', localMin: 10, localMax: 10 },
  { code: '+44', iso2: 'GB', name: 'United Kingdom', label: 'United Kingdom (+44)', localMin: 9, localMax: 10 },
  { code: '+61', iso2: 'AU', name: 'Australia', label: 'Australia (+61)', localMin: 9, localMax: 9 },

  // Asia
  { code: '+81', iso2: 'JP', name: 'Japan', label: 'Japan (+81)', localMin: 9, localMax: 10 },
  { code: '+82', iso2: 'KR', name: 'South Korea', label: 'South Korea (+82)', localMin: 8, localMax: 9 },
  { code: '+86', iso2: 'CN', name: 'China', label: 'China (+86)', localMin: 8, localMax: 11 },
  { code: '+880', iso2: 'BD', name: 'Bangladesh', label: 'Bangladesh (+880)', localMin: 10, localMax: 10 },
  { code: '+94', iso2: 'LK', name: 'Sri Lanka', label: 'Sri Lanka (+94)', localMin: 9, localMax: 9 },
  { code: '+92', iso2: 'PK', name: 'Pakistan', label: 'Pakistan (+92)', localMin: 9, localMax: 10 },
  { code: '+977', iso2: 'NP', name: 'Nepal', label: 'Nepal (+977)', localMin: 8, localMax: 10 },
  { code: '+60', iso2: 'MY', name: 'Malaysia', label: 'Malaysia (+60)', localMin: 8, localMax: 9 },
  { code: '+65', iso2: 'SG', name: 'Singapore', label: 'Singapore (+65)', localMin: 8, localMax: 8 },
  { code: '+63', iso2: 'PH', name: 'Philippines', label: 'Philippines (+63)', localMin: 9, localMax: 10 },
  { code: '+62', iso2: 'ID', name: 'Indonesia', label: 'Indonesia (+62)', localMin: 9, localMax: 11 },
  { code: '+84', iso2: 'VN', name: 'Vietnam', label: 'Vietnam (+84)', localMin: 9, localMax: 10 },
  { code: '+66', iso2: 'TH', name: 'Thailand', label: 'Thailand (+66)', localMin: 8, localMax: 9 },
  { code: '+968', iso2: 'OM', name: 'Oman', label: 'Oman (+968)', localMin: 8, localMax: 8 },
  { code: '+965', iso2: 'KW', name: 'Kuwait', label: 'Kuwait (+965)', localMin: 8, localMax: 8 },
  { code: '+974', iso2: 'QA', name: 'Qatar', label: 'Qatar (+974)', localMin: 8, localMax: 8 },
  { code: '+973', iso2: 'BH', name: 'Bahrain', label: 'Bahrain (+973)', localMin: 8, localMax: 8 },
  { code: '+962', iso2: 'JO', name: 'Jordan', label: 'Jordan (+962)', localMin: 8, localMax: 9 },
  { code: '+961', iso2: 'LB', name: 'Lebanon', label: 'Lebanon (+961)', localMin: 7, localMax: 8 },
  { code: '+98', iso2: 'IR', name: 'Iran', label: 'Iran (+98)', localMin: 10, localMax: 10 },
  { code: '+90', iso2: 'TR', name: 'Turkey', label: 'Turkey (+90)', localMin: 10, localMax: 10 },

  // Europe
  { code: '+43', iso2: 'AT', name: 'Austria', label: 'Austria (+43)', localMin: 7, localMax: 12 },
  { code: '+32', iso2: 'BE', name: 'Belgium', label: 'Belgium (+32)', localMin: 8, localMax: 9 },
  { code: '+359', iso2: 'BG', name: 'Bulgaria', label: 'Bulgaria (+359)', localMin: 8, localMax: 9 },
  { code: '+420', iso2: 'CZ', name: 'Czech Republic', label: 'Czech Republic (+420)', localMin: 9, localMax: 9 },
  { code: '+45', iso2: 'DK', name: 'Denmark', label: 'Denmark (+45)', localMin: 8, localMax: 8 },
  { code: '+372', iso2: 'EE', name: 'Estonia', label: 'Estonia (+372)', localMin: 7, localMax: 8 },
  { code: '+358', iso2: 'FI', name: 'Finland', label: 'Finland (+358)', localMin: 7, localMax: 10 },
  { code: '+33', iso2: 'FR', name: 'France', label: 'France (+33)', localMin: 9, localMax: 9 },
  { code: '+49', iso2: 'DE', name: 'Germany', label: 'Germany (+49)', localMin: 7, localMax: 11 },
  { code: '+30', iso2: 'GR', name: 'Greece', label: 'Greece (+30)', localMin: 10, localMax: 10 },
  { code: '+36', iso2: 'HU', name: 'Hungary', label: 'Hungary (+36)', localMin: 8, localMax: 9 },
  { code: '+353', iso2: 'IE', name: 'Ireland', label: 'Ireland (+353)', localMin: 8, localMax: 9 },
  { code: '+39', iso2: 'IT', name: 'Italy', label: 'Italy (+39)', localMin: 8, localMax: 10 },
  { code: '+371', iso2: 'LV', name: 'Latvia', label: 'Latvia (+371)', localMin: 8, localMax: 8 },
  { code: '+370', iso2: 'LT', name: 'Lithuania', label: 'Lithuania (+370)', localMin: 8, localMax: 8 },
  { code: '+352', iso2: 'LU', name: 'Luxembourg', label: 'Luxembourg (+352)', localMin: 8, localMax: 9 },
  { code: '+31', iso2: 'NL', name: 'Netherlands', label: 'Netherlands (+31)', localMin: 9, localMax: 9 },
  { code: '+47', iso2: 'NO', name: 'Norway', label: 'Norway (+47)', localMin: 8, localMax: 8 },
  { code: '+48', iso2: 'PL', name: 'Poland', label: 'Poland (+48)', localMin: 9, localMax: 9 },
  { code: '+351', iso2: 'PT', name: 'Portugal', label: 'Portugal (+351)', localMin: 9, localMax: 9 },
  { code: '+40', iso2: 'RO', name: 'Romania', label: 'Romania (+40)', localMin: 9, localMax: 9 },
  { code: '+34', iso2: 'ES', name: 'Spain', label: 'Spain (+34)', localMin: 9, localMax: 9 },
  { code: '+46', iso2: 'SE', name: 'Sweden', label: 'Sweden (+46)', localMin: 7, localMax: 10 },
  { code: '+41', iso2: 'CH', name: 'Switzerland', label: 'Switzerland (+41)', localMin: 9, localMax: 9 },
  { code: '+380', iso2: 'UA', name: 'Ukraine', label: 'Ukraine (+380)', localMin: 9, localMax: 9 },
  { code: '+7', iso2: 'RU', name: 'Russia / Kazakhstan', label: 'Russia / Kazakhstan (+7)', localMin: 10, localMax: 10 },

  // Africa
  { code: '+20', iso2: 'EG', name: 'Egypt', label: 'Egypt (+20)', localMin: 9, localMax: 10 },
  { code: '+212', iso2: 'MA', name: 'Morocco', label: 'Morocco (+212)', localMin: 9, localMax: 9 },
  { code: '+213', iso2: 'DZ', name: 'Algeria', label: 'Algeria (+213)', localMin: 8, localMax: 9 },
  { code: '+216', iso2: 'TN', name: 'Tunisia', label: 'Tunisia (+216)', localMin: 8, localMax: 8 },
  { code: '+254', iso2: 'KE', name: 'Kenya', label: 'Kenya (+254)', localMin: 9, localMax: 9 },
  { code: '+255', iso2: 'TZ', name: 'Tanzania', label: 'Tanzania (+255)', localMin: 9, localMax: 9 },
  { code: '+256', iso2: 'UG', name: 'Uganda', label: 'Uganda (+256)', localMin: 9, localMax: 9 },
  { code: '+234', iso2: 'NG', name: 'Nigeria', label: 'Nigeria (+234)', localMin: 8, localMax: 10 },
  { code: '+27', iso2: 'ZA', name: 'South Africa', label: 'South Africa (+27)', localMin: 9, localMax: 9 },
  { code: '+221', iso2: 'SN', name: 'Senegal', label: 'Senegal (+221)', localMin: 9, localMax: 9 },
  { code: '+233', iso2: 'GH', name: 'Ghana', label: 'Ghana (+233)', localMin: 9, localMax: 9 },

  // Americas
  { code: '+52', iso2: 'MX', name: 'Mexico', label: 'Mexico (+52)', localMin: 10, localMax: 10 },
  { code: '+55', iso2: 'BR', name: 'Brazil', label: 'Brazil (+55)', localMin: 10, localMax: 11 },
  { code: '+54', iso2: 'AR', name: 'Argentina', label: 'Argentina (+54)', localMin: 10, localMax: 10 },
  { code: '+56', iso2: 'CL', name: 'Chile', label: 'Chile (+56)', localMin: 9, localMax: 9 },
  { code: '+57', iso2: 'CO', name: 'Colombia', label: 'Colombia (+57)', localMin: 10, localMax: 10 },
  { code: '+51', iso2: 'PE', name: 'Peru', label: 'Peru (+51)', localMin: 8, localMax: 9 },
  { code: '+58', iso2: 'VE', name: 'Venezuela', label: 'Venezuela (+58)', localMin: 10, localMax: 10 },
  { code: '+507', iso2: 'PA', name: 'Panama', label: 'Panama (+507)', localMin: 7, localMax: 8 },
  { code: '+502', iso2: 'GT', name: 'Guatemala', label: 'Guatemala (+502)', localMin: 8, localMax: 8 },
  { code: '+503', iso2: 'SV', name: 'El Salvador', label: 'El Salvador (+503)', localMin: 8, localMax: 8 },
  { code: '+504', iso2: 'HN', name: 'Honduras', label: 'Honduras (+504)', localMin: 8, localMax: 8 },
  { code: '+505', iso2: 'NI', name: 'Nicaragua', label: 'Nicaragua (+505)', localMin: 8, localMax: 8 },
  { code: '+506', iso2: 'CR', name: 'Costa Rica', label: 'Costa Rica (+506)', localMin: 8, localMax: 8 },
  { code: '+509', iso2: 'HT', name: 'Haiti', label: 'Haiti (+509)', localMin: 8, localMax: 8 },
  { code: '+53', iso2: 'CU', name: 'Cuba', label: 'Cuba (+53)', localMin: 8, localMax: 8 },

  // Oceania & others
  { code: '+64', iso2: 'NZ', name: 'New Zealand', label: 'New Zealand (+64)', localMin: 8, localMax: 9 },
  { code: '+679', iso2: 'FJ', name: 'Fiji', label: 'Fiji (+679)', localMin: 7, localMax: 7 },
  { code: '+675', iso2: 'PG', name: 'Papua New Guinea', label: 'Papua New Guinea (+675)', localMin: 7, localMax: 8 },
];

// Map for quick lookup by calling code
export const COUNTRY_CODE_META_BY_CODE = COUNTRY_CODE_OPTIONS.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {});

export const getCountryByCode = (code) => COUNTRY_CODE_META_BY_CODE[code] || null;
