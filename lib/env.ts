function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,

  cognitoDomain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
  cognitoClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  cognitoRedirectUri: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI,
  cognitoLogoutRedirectUri: process.env.NEXT_PUBLIC_COGNITO_LOGOUT_REDIRECT_URI,

  requireServer: {
    cognitoDomain: () => required("NEXT_PUBLIC_COGNITO_DOMAIN"),
    cognitoClientId: () => required("NEXT_PUBLIC_COGNITO_CLIENT_ID"),
    cognitoRedirectUri: () => required("NEXT_PUBLIC_COGNITO_REDIRECT_URI"),
    cognitoLogoutRedirectUri: () =>
      required("NEXT_PUBLIC_COGNITO_LOGOUT_REDIRECT_URI"),
  },
};

