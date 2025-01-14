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
      const { token, trigger, session } = params;
      const user = params.user as unknown as any;
      const dataToken = token.user as UserAuth;
      if (trigger === 'update' && session && token) {
        dataToken.unreadTerms = session.user.unreadTerms?.map((term: any) => ({
          ...term,
        }));
      }
      if (user) {
        token.user = user;
      }
      if (user?.access) {
        token.user = user;
        token.accessToken = user.access;
        token.refreshToken = user.refreshToken;
      }
      if (user?.remember) {
        token.exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      }
      return { ...token, ...user };
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
