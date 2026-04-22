import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import api from '@base/api';
import { decodeToken } from '@utils';
import { UserAuth } from '@interfaces/user';
import { PROVIDER_GOOGLE } from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
export const options: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      checks: ['none'],
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'User login',
      credentials: {
        username: {
          label: 'Username',
          type: 'text',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
        rememberMe: {
          type: 'boolean',
        },
      },
      async authorize(credentials) {
        const response = await api.post(apiRouters.LOGIN, credentials);
        const { data } = response;
        if (response?.status !== ServerStatusCode.OK) {
          throw data;
        }
        if (data) {
          return data;
        } else return null;
      },
    }),
    CredentialsProvider({
      id: '2fa-credentials',
      name: 'Two Factor Auth',
      credentials: {
        loginSession: {
          type: 'text',
        },
        otp_code: {
          type: 'number',
        },
        rememberMe: {
          type: 'boolean',
        },
      },
      async authorize(credentials) {
        const response = await api.post(apiRouters.LOGIN_OTP, credentials);
        const { data } = response;
        if (response?.status !== ServerStatusCode.OK) {
          throw data;
        }
        if (data) {
          return data;
        } else return null;
      },
    }),
  ],
  callbacks: {
    async redirect({ baseUrl }) {
      return baseUrl;
    },
    async signIn(params) {
      const { account } = params;
      // Update token for Google provider
      if (account?.provider === PROVIDER_GOOGLE) {
        // Retrieve the Google ID token
        const idToken = account.id_token;
        // Call backend API with the Google ID token
        const { data: response } = await api.post(
          apiRouters.LOGIN_GOOGLE_VERIFY,
          {
            token: idToken,
          },
        );
        const { error } = response;
        if (error) {
          return pageRouters.LOGIN.href;
        }
      }
      return true;
    },
    async jwt(params) {
      const { token, trigger, session, user } = params;
      const dataToken = token.user as UserAuth | undefined;

      //  When calling session.update (update permissions, unreadTerms)
      if (trigger === 'update' && session && dataToken) {
        if (session.user?.unreadTerms) {
          dataToken.unreadTerms = [...session.user.unreadTerms];
        }
        if (session.user?.permissions) {
          dataToken.permissions = [...session.user.permissions];
        }

        token.user = dataToken;
        return token;
      }

      // When user logs in for the first time
      if (user) {
        const customUser = user as unknown as UserAuth;

        token.user = customUser;

        if (customUser.accessToken) {
          token.accessToken = customUser.accessToken;
          token.refreshToken = customUser.refreshToken;
        }

        if (customUser.remember) {
          token.exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
        }

        return { ...token, ...user }; // Only merge when there is a user
      }

      // Keep token if there is no user (avoid logout)
      return token;
    },
    async session({ session, token }) {
      session.user = token.user as UserAuth;
      session.accessToken = token.access as string;
      session.refreshToken = token.refreshToken as string;
      const decodedToken = decodeToken(session.accessToken);
      const expirationDate = new Date(decodedToken.exp * 1000);
      session.expires = expirationDate.toISOString();
      return Promise.resolve(session);
    },
  },
  theme: {
    colorScheme: 'light',
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
  },
};
