'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from './api';

export type PushState = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

const SW_URL = '/sw.js';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

async function detect(): Promise<PushState> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  // iPhone Safari only exposes Web Push to apps added to the Home Screen.
  if (!supported) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? 'on' : 'off';
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function subscribe(): Promise<void> {
  // Must run directly from a tap: browsers (especially iOS) ignore permission prompts that are not user-initiated.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bạn chưa cho phép thông báo. Hãy bật quyền thông báo trong cài đặt của trình duyệt.');

  const { publicKey } = await api<{ publicKey: string | null }>('/push/public-key');
  if (!publicKey) throw new Error('Máy chủ chưa bật thông báo (thiếu khóa VAPID).');

  const registration = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('Trình duyệt trả về đăng ký thông báo không hợp lệ.');
  await api('/push/subscribe', { method: 'POST', body: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } } });
}

async function unsubscribe(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api('/push/subscribe', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}

export function usePush() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['push-state'], queryFn: detect, staleTime: Infinity });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['push-state'] });

  const enable = useMutation({
    mutationFn: subscribe,
    onSuccess: () => { toast.success('Đã bật thông báo trên thiết bị này'); return refresh(); },
    onError: (error) => { toast.error(errorMessage(error)); return refresh(); },
  });
  const disable = useMutation({
    mutationFn: unsubscribe,
    onSuccess: () => { toast.success('Đã tắt thông báo'); return refresh(); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const test = useMutation({
    mutationFn: () => api<{ delivered: number }>('/push/test', { method: 'POST' }),
    onSuccess: ({ delivered }) =>
      delivered > 0 ? toast.success('Đã gửi, kiểm tra thông báo trên thiết bị') : toast.error('Chưa có thiết bị nào nhận được. Thử tắt rồi bật lại thông báo.'),
    onError: (error) => toast.error(errorMessage(error)),
  });

  // Shows a notification straight from the service worker, bypassing the server and the push service.
  // If THIS shows nothing, the problem is the browser/OS notification settings, not MONEYBOOK.
  const localTest = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.getRegistration(SW_URL);
      if (!registration) throw new Error('Chưa đăng ký service worker. Hãy tắt rồi bật lại thông báo.');
      await registration.showNotification('MONEYBOOK (thử trên máy)', {
        body: 'Nếu bạn thấy dòng này, trình duyệt và hệ điều hành đang hiển thị thông báo bình thường.',
        icon: '/icons/icon-192.png',
        tag: `local-test-${Date.now()}`, // unique tag so repeated tests are never merged silently
      });
    },
    onSuccess: () => toast.info('Đã yêu cầu hiển thị. Nếu không thấy gì, kiểm tra cài đặt thông báo của Windows/trình duyệt.'),
    onError: (error) => toast.error(errorMessage(error)),
  });

  return { state: query.data ?? ('loading' as PushState), enable, disable, test, localTest };
}
