'use client';

// NCH 3.0 — Public Landing Page (ported from approved UI; live stats)

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, FilePlus, LogIn, Phone, Globe, ArrowRight,
  ShieldCheck, Clock, Building2, ChevronRight, FileText,
  HelpCircle, BarChart2
} from 'lucide-react';
import { Button, Input } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';

const SECTORS = [
  'E-Commerce', 'Banking & Finance', 'Telecom', 'Insurance',
  'Aviation', 'Real Estate', 'Consumer Electronics', 'Healthcare',
  'Food & Beverage', 'Automobiles', 'Power / Electricity', 'Others',
];

const HELPLINE_NUMBERS = [
  { label: 'NCH Toll-Free', number: '1800-11-4000', sub: 'Mon–Sat, 8am–8pm' },
  { label: 'SMS Helpline', number: '8800001915', sub: 'Anytime' },
  { label: 'UMANG App', number: 'umang.gov.in', sub: 'Mobile & Web' },
];

const PROCESS_STEPS = [
  { step: 1, title: 'Register Grievance', desc: 'Lodge your complaint with full details and supporting documents.' },
  { step: 2, title: 'Docket Number Issued', desc: 'Receive a unique docket number to track your complaint status.' },
  { step: 3, title: 'Forwarded to Company', desc: 'NCH forwards your complaint to the concerned organization.' },
  { step: 4, title: 'Organization Responds', desc: 'The company reviews and responds within a stipulated time.' },
  { step: 5, title: 'Resolution & Closure', desc: 'Confirm resolution or escalate if your grievance remains unresolved.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [trackDocket, setTrackDocket] = useState('');
  const [trackError, setTrackError] = useState('');
  const { data: stats } = useFetch<{ total: number; resolvedThisMonth: number; resolutionRate: number }>('/api/stats');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackDocket.trim().toUpperCase();
    if (!trimmed) {
      setTrackError('Please enter a docket number.');
      return;
    }
    navigate(`/track?docket=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="nch-root min-h-screen flex flex-col bg-white">

      {/* ── Top Government Bar ───────────────────────────────────────────── */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Globe size={11} />
            Government of India
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Department of Consumer Affairs</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#" className="hover:text-white transition-colors">Screen Reader Access</a>
          <span>|</span>
          <a href="#" className="hover:text-white transition-colors">Skip to Content</a>
        </div>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-nch-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">National Consumer Helpline</h1>
              <p className="text-xs text-nch-blue-200 mt-0.5">राष्ट्रीय उपभोक्ता हेल्पलाइन</p>
              <p className="text-xs text-nch-blue-200">Department of Consumer Affairs, Government of India</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/login/consumer">
              <Button variant="outline" size="sm" icon={<LogIn size={14} />}>
                Consumer Login
              </Button>
            </Link>
            <Link to="/login/officer" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">
                <span className="text-nch-blue-200 hover:text-white">Officer Login</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Nav bar */}
        <nav className="border-t border-nch-blue-600 bg-nch-blue-800" aria-label="Site navigation">
          <div className="max-w-6xl mx-auto px-4">
            <ul className="flex items-center gap-0 text-sm overflow-x-auto">
              {[
                { label: 'Home', href: '/' },
                { label: 'About NCH', href: '#about' },
                { label: 'Lodge Grievance', href: '/login/consumer' },
                { label: 'Track Complaint', href: '/track' },
                { label: 'Consumer Rights', href: '#rights' },
                { label: 'Contact Us', href: '#contact' },
              ].map(item => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="block px-3 py-2.5 text-nch-blue-200 hover:text-white hover:bg-nch-blue-700 transition-colors whitespace-nowrap text-xs font-medium"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <section className="bg-nch-blue-700 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-nch-saffron-300 uppercase tracking-wider mb-2">
              Consumer Protection — Your Rights, Our Responsibility
            </p>
            <h2 className="text-2xl font-bold mb-3 leading-tight">
              Register and Track Your Consumer Grievance
            </h2>
            <p className="text-sm text-nch-blue-200 mb-6 leading-relaxed">
              The National Consumer Helpline (NCH) assists consumers in resolving complaints
              against companies and service providers. Lodge your grievance online and track
              its resolution status at every step.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/login/consumer">
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-nch-saffron-500 hover:bg-nch-saffron-600 border-transparent text-white"
                  icon={<FilePlus size={16} />}
                >
                  Lodge a Complaint
                </Button>
              </Link>
              <Link to="/track">
                <Button size="lg" variant="outline" icon={<Search size={16} />}>
                  Track Complaint
                </Button>
              </Link>
            </div>

            {/* Quick Track */}
            <div className="bg-white/10 border border-white/20 rounded p-4 max-w-lg">
              <p className="text-xs font-semibold text-nch-blue-100 mb-2 uppercase tracking-wide">
                Quick Track — No Login Required
              </p>
              <form onSubmit={handleTrack} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="docket-track"
                    placeholder="Enter Docket Number (e.g. NCH/2026/UP/0047821)"
                    value={trackDocket}
                    onChange={e => { setTrackDocket(e.target.value); setTrackError(''); }}
                    className="bg-white/95 text-slate-900 border-white/20 text-xs"
                    aria-label="Docket number"
                  />
                  {trackError && <p className="text-xs text-red-300 mt-1">{trackError}</p>}
                </div>
                <Button type="submit" variant="primary" className="bg-nch-blue-600 hover:bg-nch-blue-500 shrink-0">
                  Track
                </Button>
              </form>
              <p className="text-[11px] text-nch-blue-200 mt-2">For privacy, you'll also be asked for the email or mobile number registered on the complaint.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      <div className="bg-nch-blue-900 text-white border-b border-nch-blue-800">
        <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Complaints Registered', value: (stats?.total ?? 0).toLocaleString('en-IN') },
            { label: 'Resolved This Month', value: (stats?.resolvedThisMonth ?? 0).toLocaleString('en-IN') },
            { label: 'Resolution Rate', value: `${stats?.resolutionRate ?? 0}%` },
            { label: 'SLA Windows Enforced', value: '3 sectors' },
          ].map(stat => (
            <div key={stat.label} className="py-1">
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-nch-blue-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 py-10 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto space-y-12">

          {/* Process Steps */}
          <section id="process" aria-labelledby="process-heading">
            <h2 id="process-heading" className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-6">
              How the Grievance Process Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-0">
              {PROCESS_STEPS.map((s, idx) => (
                <div key={s.step} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 relative">
                  {idx < PROCESS_STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-4 left-[60%] right-[-20%] h-px bg-slate-300" aria-hidden="true" />
                  )}
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-nch-blue-600 text-white text-xs font-bold flex items-center justify-center z-10">
                    {s.step}
                  </div>
                  <div className="sm:text-center pb-6 sm:pb-0">
                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: Sectors */}
            <div className="lg:col-span-2 space-y-6">
              <section aria-labelledby="sectors-heading">
                <h2 id="sectors-heading" className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  File Complaints Across Sectors
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SECTORS.map(sector => (
                    <Link
                      key={sector}
                      to="/login/consumer"
                      className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded hover:border-nch-blue-300 hover:bg-nch-blue-50 transition-colors group text-sm text-slate-700"
                    >
                      <span>{sector}</span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-nch-blue-500 shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>

              {/* About NCH */}
              <section id="about" aria-labelledby="about-heading" className="bg-white border border-slate-200 rounded p-5">
                <h2 id="about-heading" className="text-sm font-semibold text-slate-800 mb-3">
                  About the National Consumer Helpline
                </h2>
                <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
                  <p>
                    The National Consumer Helpline (NCH) is a project of the Department of Consumer Affairs, Ministry of Consumer Affairs, Food and Public Distribution, Government of India. It provides a single-window platform for consumers to register and resolve grievances against companies and service providers.
                  </p>
                  <p>
                    NCH acts as a facilitative body — it forwards complaints to the concerned company or regulatory authority and monitors resolution. NCH does not replace the Consumer Commission or court proceedings.
                  </p>
                  <p>
                    Consumers can access NCH through the helpline number <strong>1800-11-4000</strong>, SMS, the UMANG app, or this online portal.
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: <ShieldCheck size={16} />, label: 'Consumer Protection Act, 2019', desc: 'Statutory framework' },
                    { icon: <Clock size={16} />, label: 'Timely Resolution', desc: 'SLA windows per sector (prototype)' },
                    { icon: <Building2 size={16} />, label: 'Regulatory Coordination', desc: 'IRDAI, TRAI, RBI, DGCA' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="text-nch-blue-600 shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right: Info panel */}
            <div className="space-y-4">

              {/* Helpline numbers */}
              <section id="contact" aria-labelledby="helpline-heading" className="bg-white border border-slate-200 rounded p-4">
                <h2 id="helpline-heading" className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Phone size={14} className="text-nch-blue-600" /> Contact Helpline
                </h2>
                <ul className="space-y-3">
                  {HELPLINE_NUMBERS.map(h => (
                    <li key={h.label} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{h.label}</p>
                        <p className="text-xs text-slate-400">{h.sub}</p>
                      </div>
                      <span className="text-sm font-bold text-nch-blue-700 whitespace-nowrap">{h.number}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Quick links */}
              <section aria-labelledby="quicklinks-heading" className="bg-white border border-slate-200 rounded p-4">
                <h2 id="quicklinks-heading" className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-nch-blue-600" /> Quick Links
                </h2>
                <ul className="space-y-1.5 text-sm">
                  {[
                    'Consumer Protection Act, 2019',
                    'Consumer Commission Online Filing',
                    'IRDAI Insurance Grievance',
                    'RBI Banking Ombudsman',
                    'TRAI Telecom Complaint',
                    'RERA Real Estate Grievance',
                    'DGCA Aviation Complaint',
                  ].map(label => (
                    <li key={label}>
                      <a
                        href="#"
                        className="flex items-center justify-between text-xs text-slate-600 hover:text-nch-blue-600 py-1 group"
                      >
                        {label}
                        <ArrowRight size={12} className="text-slate-300 group-hover:text-nch-blue-400 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Consumer rights tip */}
              <div className="bg-nch-saffron-50 border border-nch-saffron-200 rounded p-4">
                <div className="flex items-start gap-2">
                  <HelpCircle size={14} className="text-nch-saffron-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-nch-saffron-800 mb-1">Before you file</p>
                    <p className="text-xs text-nch-saffron-700 leading-relaxed">
                      First attempt to resolve your grievance directly with the company's customer care. Keep records of all communications. NCH intervention is most effective once direct resolution has been attempted.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Portal Access for Officials */}
          <section aria-labelledby="official-portals-heading" className="border-t border-slate-200 pt-8">
            <h2 id="official-portals-heading" className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Official Portal Access
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  role: 'NCH Officer / Agent',
                  desc: 'Access the officer case management workspace.',
                  path: '/login/officer',
                  icon: <FileText size={18} />,
                },
                {
                  role: 'Supervisor / Admin',
                  desc: 'Monitor escalations and system-wide analytics.',
                  path: '/login/supervisor',
                  icon: <BarChart2 size={18} />,
                },
                {
                  role: 'Company / Organization',
                  desc: 'View and respond to received complaints.',
                  path: '/login/company',
                  icon: <Building2 size={18} />,
                },
              ].map(portal => (
                <Link
                  key={portal.role}
                  to={portal.path}
                  className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded hover:border-nch-blue-300 hover:bg-nch-blue-50 transition-colors group"
                >
                  <span className="text-slate-400 group-hover:text-nch-blue-600 shrink-0 mt-0.5">{portal.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{portal.role}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{portal.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-nch-blue-400 ml-auto shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="font-semibold text-white mb-2">National Consumer Helpline</p>
              <p className="text-slate-500 leading-relaxed">
                Department of Consumer Affairs<br />
                Ministry of Consumer Affairs, Food and Public Distribution<br />
                Government of India
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-300 mb-2">Important Links</p>
              <ul className="space-y-1">
                {['consumerhelpline.gov.in', 'consumeraffairs.nic.in', 'edaakhil.nic.in', 'ombudsman.rbi.org.in'].map(link => (
                  <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-300 mb-2">Policy</p>
              <ul className="space-y-1">
                {['Privacy Policy', 'Terms of Use', 'Accessibility Statement', 'Copyright Policy', 'Disclaimer'].map(p => (
                  <li key={p}><a href="#" className="hover:text-white transition-colors">{p}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} Department of Consumer Affairs, Government of India.</p>
            <p className="text-slate-600">NCH-inspired Academic Prototype (not an official portal)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
