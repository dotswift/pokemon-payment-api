import dotenv from 'dotenv';

dotenv.config();

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvVarOptional(key: string): string | undefined {
  return process.env[key];
}

export const config = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: parseInt(getEnvVar('PORT', '3000'), 10),

  transfi: {
    baseUrl: getEnvVar('TRANSFI_BASE_URL', 'https://sandbox-api.transfi.com'),
    username: getEnvVar('TRANSFI_USERNAME', ''),
    password: getEnvVar('TRANSFI_PASSWORD', ''),
    mid: getEnvVar('TRANSFI_MID', ''),
  },

  supabase: {
    url: getEnvVarOptional('SUPABASE_URL') ?? '',
    serviceRoleKey: getEnvVarOptional('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  },

  security: {
    apiKey: getEnvVar('API_KEY', ''),
    webhookSecret: getEnvVarOptional('WEBHOOK_SECRET') ?? '',
  },

  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
  },

  isDevelopment: () => config.nodeEnv === 'development',
  isProduction: () => config.nodeEnv === 'production',
};
