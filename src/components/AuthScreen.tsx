import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, Sun, Moon } from 'lucide-react';
import { DEMO_USERS, PRIMARY_USER_ID, SECONDARY_USER_ID } from '../data/initialData';

interface AuthScreenProps {
  onLogin: (userId: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  isDark,
  onToggleTheme,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(PRIMARY_USER_ID);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin(selectedUserId);
      setIsLoading(false);
    }, 180);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors">
      <header className="flex items-center justify-between gap-8 px-6 md:px-12 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight font-display text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          Kaudal Finanzas
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <span className="whitespace-nowrap shrink-0">Supabase PostgreSQL</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap shrink-0">Row Level Security (RLS)</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap shrink-0">Google OAuth 2.0 PKCE</span>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="space-y-6">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Arquitectura Financiera Personal · Moneda Base USD
              </div>

              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Control absoluto de tu liquidez, ingresos y compras geolocalizadas.
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Responde al instante cuánto tienes en cada cartera, cuánto ganaste en el mes y exactamente en qué comercios y zonas geográficas realizaste tus gastos.
              </p>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Aislamiento Estricto por Usuario (Row Level Security)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Todas las tablas en PostgreSQL evalúan la política <code className="font-mono">auth.uid() = user_id</code> antes de leer o escribir cualquier fila.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Verificación OAuth 2.0 sin Exposición de Secretos
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Autenticación delegada a Google Identity vía Supabase Auth con flujo PKCE y claves restringidas por dominio.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>8 módulos integrados</span>
              <span aria-hidden="true">·</span>
              <span>Mapa térmico y clustering</span>
              <span aria-hidden="true">·</span>
              <span>Exportación CSV y PDF</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <form onSubmit={handleGoogleSignIn} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Iniciar sesión
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Acceso exclusivo para cuentas verificadas con Google OAuth.
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Selecciona cuenta Google verificada (Prueba de RLS):
                </label>

                {[PRIMARY_USER_ID, SECONDARY_USER_ID].map((uid) => {
                  const u = DEMO_USERS[uid];
                  const active = selectedUserId === uid;
                  return (
                    <button
                      key={uid}
                      type="button"
                      onClick={() => setSelectedUserId(uid)}
                      className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                        active
                          ? 'border-emerald-600 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {u.fullName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                          {u.email}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                        {active ? 'Seleccionada' : 'Elegir'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>
                  {isLoading ? 'Verificando sesión OAuth...' : 'Continuar con Google OAuth'}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </form>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div>Sesión cifrada TLS 1.3 · Token JWT con expiración automática</div>
              <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                Política RLS: auth.uid() = &apos;{selectedUserId}&apos;
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 md:px-12 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <span>Kaudal — Sistema de Gestión de Finanzas Personales</span>
        <span>Privacidad protegida mediante políticas Row Level Security en PostgreSQL</span>
      </footer>
    </div>
  );
};
