import { env } from 'cloudflare:workers';
import { classify } from '@/lib/classify';
export async function POST(request: Request) {
  return classify(request, (env as unknown as Record<string, string>).JEV_API_KEY);
}
