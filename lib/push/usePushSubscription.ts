'use client';

import { useCallback, useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    );
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) throw new Error('Push not supported on this browser');

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY env var');

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission denied');

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const json = subscription.toJSON();

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        device_type: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        browser: (() => {
          const ua = navigator.userAgent;
          if (/Edg/.test(ua)) return 'Edge';
          if (/Chrome/.test(ua)) return 'Chrome';
          if (/Firefox/.test(ua)) return 'Firefox';
          if (/Safari/.test(ua)) return 'Safari';
          return null;
        })(),
        os: navigator.platform,
        user_agent: navigator.userAgent,
      }),
    });

    if (!res.ok) throw new Error('Failed to save subscription');
    setIsSubscribed(true);
    return subscription;
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const res = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    if (!res.ok) throw new Error('Failed to remove subscription on server');

    await subscription.unsubscribe();
    setIsSubscribed(false);
  }, []);

  return { subscribe, unsubscribe, isSubscribed, setIsSubscribed, isSupported };
}