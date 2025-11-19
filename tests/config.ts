// Configuración unificada para staging y producción
// La única diferencia entre staging y producción es la URL base
// 
// Para STAGING: establecer FIESTAMAS_BASE_URL (ej: https://staging.fiestamas.com)
// Para PRODUCCIÓN: establecer FIESTAMAS_PROD_BASE_URL (ej: https://fiestamas.com)
// 
// Si no se establece ninguna variable, se usa https://fiestamas.com por defecto

const isProd = process.env.ENVIRONMENT === 'prod' || process.env.FIESTAMAS_PROD_BASE_URL;

// URL base - ÚNICA DIFERENCIA entre staging y producción
export const DEFAULT_BASE_URL = isProd
  ? (process.env.FIESTAMAS_PROD_BASE_URL ?? 'https://staging.fiestamas.com')
  : (process.env.FIESTAMAS_BASE_URL ?? 'https://staging.fiestamas.com');

// Credenciales (pueden ser las mismas o diferentes según el ambiente)
export const PROVIDER_EMAIL = process.env.FIESTAMAS_PROVIDER_EMAIL ?? process.env.FIESTAMAS_PROD_PROVIDER_EMAIL ?? 'fiestamasqaprv@gmail.com';
export const PROVIDER_PASSWORD = process.env.FIESTAMAS_PROVIDER_PASSWORD ?? process.env.FIESTAMAS_PROD_PROVIDER_PASSWORD ?? 'Fiesta2025$';

export const CLIENT_EMAIL = process.env.FIESTAMAS_CLIENT_EMAIL ?? process.env.FIESTAMAS_PROD_CLIENT_EMAIL ?? 'fiestamasqacliente@gmail.com';
export const CLIENT_PASSWORD = process.env.FIESTAMAS_CLIENT_PASSWORD ?? process.env.FIESTAMAS_PROD_CLIENT_PASSWORD ?? 'Fiesta2025$';

export const DEFAULT_ACCOUNT_PASSWORD = process.env.FIESTAMAS_ACCOUNT_PASSWORD ?? process.env.FIESTAMAS_PROD_ACCOUNT_PASSWORD ?? 'Fiesta2025$';

export const REGISTRATION_EMAIL_STEP = process.env.FIESTAMAS_REGISTRATION_EMAIL_STEP ?? 'fiestamasqa+11@gmail.com';
export const REGISTRATION_EMAIL_LOG = process.env.FIESTAMAS_REGISTRATION_EMAIL_LOG ?? 'fiestamasqa+10@gmail.com';
export const REGISTRATION_EMAIL_DEFAULT = process.env.FIESTAMAS_REGISTRATION_EMAIL_DEFAULT ?? 'fiestamasqa+12@gmail.com';


