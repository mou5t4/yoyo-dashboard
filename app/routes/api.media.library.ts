import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getMediaLibrary } from '~/services/media.service';
import { logger } from '~/lib/logger.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const library = await getMediaLibrary();
    return json({ success: true, library });
  } catch (error) {
    logger.error('Failed to fetch media library', error);
    return json({ error: 'Failed to fetch library' }, { status: 500 });
  }
}





