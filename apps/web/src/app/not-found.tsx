import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Không tìm thấy trang</h1>
      <Link href="/dashboard" className="text-sm text-primary underline">
        Về trang chủ
      </Link>
    </div>
  );
}
