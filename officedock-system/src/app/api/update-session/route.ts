import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';

import { ServerStatusCode } from '@constants/enums';

export async function POST(req: Request) {
  const session = await getServerSession(options);
  if (!session) {
    return new Response('Unauthorized', {
      status: ServerStatusCode.UNAUTHORIZED,
    });
  }

  const { termsSteps } = await req.json();

  session.user.unreadTerms = termsSteps;
  return new Response(JSON.stringify({ success: true, session }), {
    status: ServerStatusCode.OK,
  });
}
