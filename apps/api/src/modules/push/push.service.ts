import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribePushDto } from './dto/push.dto';

export interface PushPayload {
  title: string;
  body: string;
  url: string; // where the app should open when the notification is tapped
  tag: string; // same tag = replaces the previous notification instead of stacking
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private publicKeyValue: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit(): void {
    const publicKey = this.config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = this.config.get('VAPID_PRIVATE_KEY', { infer: true });
    const subject = this.config.get('VAPID_SUBJECT', { infer: true });
    if (!publicKey || !privateKey || !subject) {
      this.logger.warn('VAPID keys are not set: push notifications are disabled');
      return;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.publicKeyValue = publicKey;
  }

  /** null when the server has no VAPID keys (the web app then hides the "enable notifications" flow). */
  publicKey(): string | null {
    return this.publicKeyValue;
  }

  async subscribe(userId: string, dto: SubscribePushDto, userAgent?: string): Promise<{ subscribed: true }> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      // If the same browser signs in as another user, the subscription moves to the new user.
      create: { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth, userAgent: userAgent?.slice(0, 255) },
      update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth, userAgent: userAgent?.slice(0, 255) },
    });
    return { subscribed: true };
  }

  async unsubscribe(userId: string, endpoint: string): Promise<{ unsubscribed: true }> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { unsubscribed: true };
  }

  /** Sends to every device of the user. Returns how many devices accepted it. Dead subscriptions are removed. */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.publicKeyValue) return 0;
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    let delivered = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 24 }, // keep trying for a day if the phone is offline
          );
          delivered += 1;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.deleteMany({ where: { id: sub.id } }); // app uninstalled / permission revoked
          } else {
            this.logger.warn(`Push failed (${status ?? 'network'}) for subscription ${sub.id}`);
          }
        }
      }),
    );
    return delivered;
  }
}
