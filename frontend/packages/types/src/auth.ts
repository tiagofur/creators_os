export type OAuthProvider = 'google' | 'github';

export interface AuthTokens {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  password_confirmation: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
  provider: OAuthProvider;
}
