import { UserAuth } from '@interfaces/user';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends Token {
    user: UserAuth;
    accessToken: string;
    refreshToken: string;
  }
}
interface Token {
  user: UserAuth;
  accessToken?: string;
  refreshToken?: string;
}
