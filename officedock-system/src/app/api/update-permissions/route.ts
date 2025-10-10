import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';
import { ServerStatusCode } from '@constants/enums';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);

    if (!session) {
      return new Response('Unauthorized', {
        status: ServerStatusCode.UNAUTHORIZED,
      });
    }

    const { permissions } = await req.json();

    if (!Array.isArray(permissions)) {
      return new Response('Invalid permissions format', {
        status: ServerStatusCode.BAD_REQUEST,
      });
    }
    session.user.permissions = permissions;

    return new Response(JSON.stringify({ success: true, session }), {
      status: ServerStatusCode.OK,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Internal Server Error', {
      status: ServerStatusCode.INTERNAL_SERVER_ERROR,
    });
  }
}
