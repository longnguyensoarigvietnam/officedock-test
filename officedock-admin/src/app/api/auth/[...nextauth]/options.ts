import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { apiRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { UserAuth } from '@interfaces/user';
import api from '@base/api';
import { decodeToken } from '@utils';

export const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      credentials: {
        loginSession: {
          type: 'text',
        },
        otp_code: {
          type: 'number',
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
    async signIn() {
      return true;
    },
    async jwt(params) {
      const { token, trigger, session } = params;
      const user = params.user as unknown as any;
      if (trigger === 'update' && session && token) {
        // If user has changed email
        if (session.email) {
          (token.profile as any).email = session.email;
        }
        if (session.firstName) {
          (token.user as any).firstName = session.firstName;
        }
        if (session.lastName) {
          (token.user as any).lastName = session.lastName;
        }
        if (session.role_id) {
          (token.profile as any).role_id = session.role_id;
        }
      }
      // Update the token for normal login
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

      // Set the session expiration based on the formatted expiration
      const decodedToken = decodeToken(session.accessToken);
      const expirationDate = new Date(decodedToken.exp * 1000);
      session.expires = expirationDate.toISOString();

      return Promise.resolve(session);
    },
  },

  theme: {
    colorScheme: 'light',
  },

  pages: {
    signIn: '/',
    signOut: '/',
  },
  session: {
    strategy: 'jwt',
  },
};
