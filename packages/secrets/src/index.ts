// Secrets module stub - now replaced with .env
// These exports are kept for compatibility but not used

export class SecretsProvider {
  constructor(config: any) {}
  async preloadSecrets() {}
  loadAndValidate(secretsClass: any) {
    return new secretsClass();
  }
}

export function SecretString(name: string) {
  return function (target: any, propertyKey: string) {
    // Decorator stub
  };
}

export function SecretObject(factory: () => any) {
  return function (target: any, propertyKey: string) {
    // Decorator stub
  };
}
