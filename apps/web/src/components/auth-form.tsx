'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { api, errorMessage, tokenStore, wakeServer } from '@/lib/api';
import type { User } from '@/lib/types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Field } from './ui/field';
import { Input } from './ui/input';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});
const registerSchema = z.object({
  name: z.string().min(1, 'Nhập tên').max(100),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72),
});
type Values = { name?: string; email: string; password: string };

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isLogin = mode === 'login';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  useEffect(() => {
    if (tokenStore.get()) router.replace('/dashboard');
    else wakeServer();
  }, [router]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await api<{ accessToken: string; user: User }>(isLogin ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: values,
      });
      tokenStore.set(result.accessToken);
      queryClient.setQueryData(['me'], result.user);
      toast.success(isLogin ? 'Đăng nhập thành công' : 'Tạo tài khoản thành công');
      router.replace('/dashboard');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-primary">MONEYBOOK</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isLogin ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {!isLogin ? (
            <Field label="Tên hiển thị" error={errors.name?.message}>
              <Input {...register('name')} autoComplete="name" />
            </Field>
          ) : null}
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register('email')} autoComplete="email" />
          </Field>
          <Field label="Mật khẩu" error={errors.password?.message}>
            <Input type="password" {...register('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang xử lý…' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <Link href={isLogin ? '/register' : '/login'} className="font-medium text-primary underline">
            {isLogin ? 'Đăng ký' : 'Đăng nhập'}
          </Link>
        </p>
      </Card>
    </div>
  );
}
