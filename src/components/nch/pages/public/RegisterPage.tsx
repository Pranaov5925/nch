'use client';

// NCH 3.0 — Consumer Registration Page (ported; real registration API)

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronRight, Check } from 'lucide-react';
import { Button, FormField, Input, Select } from '@/components/nch/ui';
import { useAuth } from '@/context/AuthContext';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh', 'Others'
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

const INITIAL: FormData = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', city: '', state: '', pincode: '',
  password: '', confirmPassword: '', agreeTerms: false
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(err => ({ ...err, [field]: undefined }));
  };

  const validateStep1 = () => {
    const newErrors: typeof errors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!form.email.trim()) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email address.';
    if (!form.phone.trim()) newErrors.phone = 'Mobile number is required.';
    else if (!/^[6-9]\d{9}$/.test(form.phone)) newErrors.phone = 'Enter a valid 10-digit mobile number.';
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors: typeof errors = {};
    if (!form.address.trim()) newErrors.address = 'Address is required.';
    if (!form.city.trim()) newErrors.city = 'City is required.';
    if (!form.state) newErrors.state = 'Please select a state.';
    if (!form.pincode.trim()) newErrors.pincode = 'PIN Code is required.';
    else if (!/^\d{6}$/.test(form.pincode)) newErrors.pincode = 'Enter a valid 6-digit PIN Code.';
    if (!form.password) newErrors.password = 'Password is required.';
    else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters.';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    if (!form.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms and conditions.';
    return newErrors;
  };

  const handleNext = () => {
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setGeneralError('');
    try {
      await register({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`,
        password: form.password,
      });
      navigate('/register/success');
    } catch (err) {
      setGeneralError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nch-root min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-slate-900 text-slate-400 text-xs py-1.5 px-4 flex items-center gap-2">
        <ShieldCheck size={11} />
        Government of India — Department of Consumer Affairs
      </div>
      <header className="bg-nch-blue-700 text-white px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold">National Consumer Helpline</p>
              <p className="text-xs text-nch-blue-300">Consumer Registration</p>
            </div>
          </Link>
          <Link to="/login/consumer" className="text-xs text-nch-blue-200 hover:text-white">Already registered? Sign in</Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* Stepper */}
          <div className="flex items-center gap-0 mb-6">
            {[
              { num: 1, label: 'Personal Information' },
              { num: 2, label: 'Address & Password' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                    step > s.num
                      ? 'bg-green-600 border-green-600 text-white'
                      : step === s.num
                        ? 'bg-nch-blue-600 border-nch-blue-600 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {step > s.num ? <Check size={13} /> : s.num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${step === s.num ? 'text-nch-blue-700' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < 1 && <div className={`flex-1 h-px mx-3 ${step > 1 ? 'bg-green-400' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h1 className="text-base font-semibold text-slate-900">
                {step === 1 ? 'Personal Information' : 'Address & Password'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Step {step} of 2 — All fields marked * are required</p>
            </div>

            <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="px-6 py-5 space-y-4" noValidate>
              {generalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">{generalError}</div>
              )}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="First Name" htmlFor="reg-first" required error={errors.firstName}>
                      <Input id="reg-first" value={form.firstName} onChange={set('firstName')} placeholder="Priya" error={errors.firstName} />
                    </FormField>
                    <FormField label="Last Name" htmlFor="reg-last" required error={errors.lastName}>
                      <Input id="reg-last" value={form.lastName} onChange={set('lastName')} placeholder="Sharma" error={errors.lastName} />
                    </FormField>
                  </div>
                  <FormField label="Email Address" htmlFor="reg-email" required error={errors.email}
                    hint="You will use this email to log in and receive complaint updates.">
                    <Input id="reg-email" type="email" value={form.email} onChange={set('email')} placeholder="priya.sharma@example.com" error={errors.email} />
                  </FormField>
                  <FormField label="Mobile Number" htmlFor="reg-phone" required error={errors.phone}
                    hint="Enter 10-digit Indian mobile number.">
                    <Input id="reg-phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="9876543210" maxLength={10} error={errors.phone} />
                  </FormField>
                  <Button type="submit" variant="primary" size="lg" className="w-full" icon={<ChevronRight size={16} />} iconPosition="right">
                    Continue to Step 2
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <FormField label="Address" htmlFor="reg-address" required error={errors.address}>
                    <Input id="reg-address" value={form.address} onChange={set('address')} placeholder="Flat/House No., Street, Area" error={errors.address} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="City / Town" htmlFor="reg-city" required error={errors.city}>
                      <Input id="reg-city" value={form.city} onChange={set('city')} placeholder="Noida" error={errors.city} />
                    </FormField>
                    <FormField label="PIN Code" htmlFor="reg-pincode" required error={errors.pincode}>
                      <Input id="reg-pincode" value={form.pincode} onChange={set('pincode')} placeholder="201301" maxLength={6} error={errors.pincode} />
                    </FormField>
                  </div>
                  <FormField label="State / UT" htmlFor="reg-state" required error={errors.state}>
                    <Select id="reg-state" value={form.state} onChange={set('state')} placeholder="-- Select State --" error={errors.state}>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </FormField>

                  <hr className="border-slate-100" />

                  <FormField label="Create Password" htmlFor="reg-password" required error={errors.password}
                    hint="Minimum 8 characters. Use a mix of letters, numbers and symbols.">
                    <Input id="reg-password" type="password" value={form.password} onChange={set('password')} placeholder="Create a strong password" error={errors.password} />
                  </FormField>
                  <FormField label="Confirm Password" htmlFor="reg-confirm" required error={errors.confirmPassword}>
                    <Input id="reg-confirm" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" error={errors.confirmPassword} />
                  </FormField>

                  <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-slate-300"
                      checked={form.agreeTerms}
                      onChange={e => { setForm(f => ({ ...f, agreeTerms: e.target.checked })); setErrors(err => ({ ...err, agreeTerms: undefined })); }}
                    />
                    <span>
                      I agree to the{' '}
                      <a href="#" className="text-nch-blue-600 underline">Terms and Conditions</a>
                      {' '}and{' '}
                      <a href="#" className="text-nch-blue-600 underline">Privacy Policy</a>
                      {' '}of the National Consumer Helpline portal.
                    </span>
                  </label>
                  {errors.agreeTerms && <p className="text-xs text-red-600">{errors.agreeTerms}</p>}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      ← Back
                    </Button>
                    <Button type="submit" variant="primary" loading={loading} className="flex-1">
                      Register Account
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
