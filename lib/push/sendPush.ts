import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { getNotificationPreferences } from '../settings/NotificationPreferences';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export async function sendPushToUser(appUserId: string, payload: PushPayload) {
  const { data: subs, error } = await supabaseAdmin
    .from('push_subscription')
    .select('*')
    .eq('app_user_id', appUserId)
    .eq('is_active', true);

  if (error) throw error;
  if (!subs?.length) return;

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );

        await supabaseAdmin
          .from('push_subscription')
          .update({ last_used_at: new Date().toISOString() })
          .eq('push_subscription_id', sub.push_subscription_id);
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscription')
            .update({ is_active: false })
            .eq('push_subscription_id', sub.push_subscription_id);
        }
        // throw err;
      }
    })
  );

  return results;
}