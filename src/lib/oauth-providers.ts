/**
 * OAuth Provider Registry
 *
 * Defines configuration for each supported upstream OAuth provider.
 * Providers are only "available" if their credentials are configured in env vars.
 */

import type { Env } from '../../types/worker';

export interface OAuthProviderConfig {
  /** Display name (e.g., "GitHub") */
  name: string;
  /** Internal key (e.g., "github") */
  provider: string;
  /** OAuth authorization URL */
  authUrl: string;
  /** OAuth token exchange URL */
  tokenUrl: string;
  /** User info endpoint URL */
  userInfoUrl: string;
  /** Required OAuth scopes */
  scopes: string[];
  /** Returns credentials if configured, null otherwise */
  getCredentials: (env: Env) => { clientId: string; clientSecret: string; redirectUri: string } | null;
  /** Parse provider-specific user info into normalized shape */
  parseUserInfo: (data: any) => {
    id: string;
    email: string | null;
    name?: string;
    username?: string;
    avatarUrl?: string;
  };
  /** Token request body format (default: 'json') */
  tokenRequestFormat?: 'json' | 'form';
  /** Dot-path to access_token in token response (default: 'access_token') */
  tokenResponsePath?: string;
  /** Custom headers for user info request */
  userInfoHeaders?: (token: string) => Record<string, string>;
  /** Additional params to include in the authorization URL */
  authParams?: Record<string, string>;
  /** HTTP method for user info request (default: 'GET') */
  userInfoMethod?: 'GET' | 'POST';
  /** Body for user info request (used with POST, e.g., GraphQL queries) */
  userInfoBody?: string;
}

export const oauthProviders: Record<string, OAuthProviderConfig> = {
  github: {
    name: 'GitHub',
    provider: 'github',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
    getCredentials: (env) => {
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_REDIRECT_URI) return null;
      return { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET, redirectUri: env.GITHUB_REDIRECT_URI };
    },
    parseUserInfo: (data) => ({
      id: String(data.id),
      email: data.email || null,
      name: data.name || data.login,
      username: data.login,
      avatarUrl: data.avatar_url,
    }),
    userInfoHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'TampaDevs-Events-API',
    }),
  },

  google: {
    name: 'Google',
    provider: 'google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scopes: ['openid', 'email', 'profile'],
    getCredentials: (env) => {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) return null;
      return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_REDIRECT_URI };
    },
    parseUserInfo: (data) => ({
      id: data.sub,
      email: data.email || null,
      name: data.name,
      avatarUrl: data.picture,
    }),
    tokenRequestFormat: 'form',
    userInfoHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
  },

  linkedin: {
    name: 'LinkedIn',
    provider: 'linkedin',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scopes: ['openid', 'profile', 'email'],
    getCredentials: (env) => {
      if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !env.LINKEDIN_REDIRECT_URI) return null;
      return { clientId: env.LINKEDIN_CLIENT_ID, clientSecret: env.LINKEDIN_CLIENT_SECRET, redirectUri: env.LINKEDIN_REDIRECT_URI };
    },
    parseUserInfo: (data) => ({
      id: data.sub,
      email: data.email || null,
      name: data.name,
      avatarUrl: data.picture,
    }),
    tokenRequestFormat: 'form',
    userInfoHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
  },

  slack: {
    name: 'Slack',
    provider: 'slack',
    authUrl: 'https://slack.com/openid/connect/authorize',
    tokenUrl: 'https://slack.com/api/openid.connect.token',
    userInfoUrl: 'https://slack.com/api/openid.connect.userInfo',
    scopes: ['openid', 'profile', 'email'],
    getCredentials: (env) => {
      if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET || !env.SLACK_REDIRECT_URI) return null;
      return { clientId: env.SLACK_CLIENT_ID, clientSecret: env.SLACK_CLIENT_SECRET, redirectUri: env.SLACK_REDIRECT_URI };
    },
    tokenRequestFormat: 'form',
    tokenResponsePath: 'access_token',

    // OIDC needs nonce; state too
    authParams: {
      response_type: 'code',
      // nonce should be generated per-request; if your framework supports it, inject dynamically
    },
    userInfoHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
    parseUserInfo: (data) => ({
      id: data.sub,
      email: data.email || null,
      name: data.name,
      avatarUrl: data.picture,
      username: data["https://slack.com/user_id"] ?? undefined
    }),
  },

  meetup: {
    name: 'Meetup',
    provider: 'meetup',
    authUrl: 'https://secure.meetup.com/oauth2/authorize',
    tokenUrl: 'https://secure.meetup.com/oauth2/access',
    userInfoUrl: 'https://api.meetup.com/gql',
    scopes: [],
    getCredentials: (env) => {
      if (!env.MEETUP_OAUTH_CLIENT_ID || !env.MEETUP_OAUTH_CLIENT_SECRET || !env.MEETUP_REDIRECT_URI) return null;
      return { clientId: env.MEETUP_OAUTH_CLIENT_ID, clientSecret: env.MEETUP_OAUTH_CLIENT_SECRET, redirectUri: env.MEETUP_REDIRECT_URI };
    },
    parseUserInfo: (data) => {
      // GraphQL response: { data: { self: { id, name, memberPhoto, email } } }
      const self = data?.data?.self;
      return {
        id: String(self?.id || ''),
        email: self?.email || null,
        name: self?.name,
        avatarUrl: self?.memberPhoto?.highResUrl || self?.memberPhoto?.baseUrl,
      };
    },
    tokenRequestFormat: 'form',
    userInfoMethod: 'POST',
    userInfoBody: JSON.stringify({
      query: '{ self { id name email memberPhoto { baseUrl highResUrl } } }',
    }),
    userInfoHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
  },

  eventbrite: {
    name: 'Eventbrite',
    provider: 'eventbrite',
    authUrl: 'https://www.eventbrite.com/oauth/authorize',
    tokenUrl: 'https://www.eventbrite.com/oauth/token',
    userInfoUrl: 'https://www.eventbriteapi.com/v3/users/me/',
    scopes: [],
    getCredentials: (env) => {
      if (!env.EVENTBRITE_OAUTH_CLIENT_ID || !env.EVENTBRITE_OAUTH_CLIENT_SECRET || !env.EVENTBRITE_REDIRECT_URI) return null;
      return { clientId: env.EVENTBRITE_OAUTH_CLIENT_ID, clientSecret: env.EVENTBRITE_OAUTH_CLIENT_SECRET, redirectUri: env.EVENTBRITE_REDIRECT_URI };
    },
    parseUserInfo: (data) => ({
      id: String(data.id),
      email: data.emails?.[0]?.email || null,
      name: data.name,
      avatarUrl: data.image?.url,
    }),
    tokenRequestFormat: 'form',
    userInfoHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
  },

  apple: {
    name: 'Apple',
    provider: 'apple',
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    userInfoUrl: '', // Apple doesn't have a user info endpoint; data comes from id_token
    scopes: ['name', 'email'],
    getCredentials: (env) => {
      if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY || !env.APPLE_REDIRECT_URI) return null;
      return { clientId: env.APPLE_CLIENT_ID, clientSecret: '', redirectUri: env.APPLE_REDIRECT_URI };
    },
    parseUserInfo: () => ({
      id: '',
      email: null,
    }),
    tokenRequestFormat: 'form',
    authParams: {
      response_mode: 'form_post',
      response_type: 'code',
    },
  },

  discord: {
    name: 'Discord',
    provider: 'discord',
    authUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'email'],
    getCredentials: (env) => {
      if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_REDIRECT_URI) return null;
      return { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET, redirectUri: env.DISCORD_REDIRECT_URI };
    },
    parseUserInfo: (data) => ({
      id: String(data.id),
      email: data.email || null,
      name: data.global_name || data.username,
      username: data.username,
      avatarUrl: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : undefined,
    }),
    tokenRequestFormat: 'form',
    userInfoHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
  },
};

/**
 * Get all configured (credentials present) providers for the given environment
 */
export function getConfiguredProviders(env: Env): OAuthProviderConfig[] {
  return Object.values(oauthProviders).filter(p => p.getCredentials(env) !== null);
}

/**
 * Get a specific provider config by key
 */
export function getProvider(key: string): OAuthProviderConfig | undefined {
  return oauthProviders[key];
}
