'use client';

// NCH 3.0 — Login Pages (ported; real session auth)

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button, FormField, Input } from '@/components/nch/ui';
import { useAuth, ROLE_HOME } from '@/context/AuthContext';
import type { UserRole } from '@/lib/nch/types';

const ROLE_CONFIG: Record<string, {
  role: UserRole;
  title: string;
  subtitle: string;
  portal: string;
  demo: { id: string; pass: string; name: string };
  registerLink?: string;
}> = {
  consumer: {
    role: 'consumer',
    title: 'Consumer Login',
    subtitle: 'Sign in to manage your grievances',
    portal: 'Consumer Portal',
    demo: { id: 'priya.sharma@gmail.com', pass: 'demo1234', name: 'Priya Sharma' },
    registerLink: '/register',
  },
  officer: {
    role: 'officer',
    title: 'NCH Officer Login',
    subtitle: 'Officer Workspace — Authorised Access Only',
    portal: 'Officer Workspace',
    demo: { id: 'r.verma@nch.gov.in', pass: 'demo1234', name: 'Sh. Ramesh Kumar Verma' },
  },
  supervisor: {
    role: 'supervisor',
    title: 'Supervisor / Admin Login',
    subtitle: 'Supervisor Administration — Authorised Access Only',
    portal: 'Supervisor Admin',
    demo: { id: 'm.agarwal@nch.gov.in', pass: 'demo1234', name: 'Smt. Meena Agarwal' },
  },
  company: {
    role: 'company',
    title: 'Company / Organisation Login',
    subtitle: 'Access the NCH Company Response Portal',
    portal: 'Company Portal',
    demo: { id: 'nch.nodal@flipkart.com', pass: 'demo1234', name: 'Flipkart Nodal Team' },
  },
};

export default function LoginPage() {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const config = ROLE_CONFIG[roleSlug ?? 'consumer'] ?? ROLE_CONFIG.consumer;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Email / ID is required.';
    if (!password) newErrors.password = 'Password is required.';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role !== config.role) {
        // signed in, but through the wrong portal — still send to their home
        navigate(ROLE_HOME[user.role]);
        return;
      }
      navigate(ROLE_HOME[user.role]);
    } catch (err) {
      setErrors({ general: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(config.demo.id);
    setPassword(config.demo.pass);
    setErrors({});
  };

  const isOfficialPortal = config.role !== 'consumer';

  return (
    <div className="nch-root min-h-screen bg-slate-50 flex flex-col">
      {/* Gov bar */}
      <div className="bg-slate-900 text-slate-400 text-xs py-1.5 px-4 flex items-center gap-2">
        <ShieldCheck size={11} />
        <span>Government of India — Department of Consumer Affairs</span>
      </div>

      {/* Header */}
      <header className="bg-nch-blue-700 text-white px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">National Consumer Helpline</p>
              <p className="text-xs text-nch-blue-300">{config.portal}</p>
            </div>
          </Link>
          <Link to="/" className="text-xs text-nch-blue-200 hover:text-white">← Home</Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {isOfficialPortal && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>This portal is for authorised NCH personnel only. Unauthorised access is a punishable offence under IT Act, 2000.</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100">
              <h1 className="text-base font-semibold text-slate-900">{config.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{config.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" noValidate>
              {errors.general && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <AlertCircle size={14} className="shrink-0" />
                  {errors.general}
                </div>
              )}

              <FormField label={config.role === 'consumer' ? 'Email Address' : 'Official Email / User ID'} htmlFor="login-email" required error={errors.email}>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder={config.demo.id}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(err => ({ ...err, email: undefined })); }}
                  error={errors.email}
                />
              </FormField>

              <FormField label="Password" htmlFor="login-password" required error={errors.password}>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrors(err => ({ ...err, password: undefined })); }}
                    error={errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </FormField>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300" /> Remember me
                </label>
                <a href="#" className="text-nch-blue-600 hover:text-nch-blue-800">Forgot Password?</a>
              </div>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Sign In
              </Button>
            </form>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg space-y-3">
              {/* Demo credentials */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                <p className="font-semibold text-blue-800 mb-1">Demo Credentials (Academic Project)</p>
                <p className="text-blue-700">ID: <code className="font-mono">{config.demo.id}</code></p>
                <p className="text-blue-700">Pass: <code className="font-mono">{config.demo.pass}</code></p>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="mt-1.5 text-blue-600 underline hover:text-blue-800"
                >
                  Fill credentials
                </button>
              </div>

              {config.registerLink && (
                <p className="text-xs text-center text-slate-500">
                  New consumer?{' '}
                  <Link to={config.registerLink} className="text-nch-blue-600 font-medium hover:text-nch-blue-800">
                    Register here
                  </Link>
                </p>
              )}

              <div className="text-xs text-center text-slate-400 space-x-3">
                {Object.entries(ROLE_CONFIG)
                  .filter(([slug]) => slug !== (roleSlug ?? 'consumer'))
                  .map(([slug, c]) => (
                    <Link key={slug} to={`/login/${slug}`} className="hover:text-nch-blue-600">
                      {c.portal}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
