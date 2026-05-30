let _config = null;
let _credentialStore = null;
let _providerRegistry = null;

export function initAppContext(config, credentialStore, providerRegistry) {
  _config = config;
  _credentialStore = credentialStore;
  _providerRegistry = providerRegistry;
}

export function getConfig() {
  return _config;
}

export function getCredentialStore() {
  return _credentialStore;
}

export function getProviderRegistry() {
  return _providerRegistry;
}
