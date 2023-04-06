import { InjectionToken } from "@angular/core";

export interface Configuration {
  production: boolean
  keycloakUrl: string,
  keycloakRealm: string,
  keycloakClientId: string
}

// We use a dependency injection token to access the configuration in our application.
export const CONFIGURATION_TOKEN = new InjectionToken<Configuration>('CONFIGURATION_TOKEN');
