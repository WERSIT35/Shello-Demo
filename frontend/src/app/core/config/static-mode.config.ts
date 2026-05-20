type ShelloRuntimeConfig = {
  apiBaseUrl?: string;
  staticMode?: boolean | string;
};

function readRuntimeFlag(): boolean {
  const runtimeConfig = (globalThis as { __SHELLO_CONFIG__?: ShelloRuntimeConfig }).__SHELLO_CONFIG__;
  if (!runtimeConfig) {
    return false;
  }

  const value = runtimeConfig.staticMode;
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }

  return false;
}

export const IS_STATIC_MODE: boolean = readRuntimeFlag();

export function isStaticMode(): boolean {
  return IS_STATIC_MODE;
}
