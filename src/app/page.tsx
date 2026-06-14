import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Яндекс Маркет
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Управление цифровыми товарами
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/login" className="btn-primary">
            Войти
          </Link>
          <Link href="/register" className="btn-secondary">
            Регистрация
          </Link>
        </div>
      </div>
    </div>
  );
}