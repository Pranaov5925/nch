'use client';

// NCH 3.0 — Submission Confirmation Page (ported)

import { useLocation, Link } from 'react-router-dom';
import { CheckCircle2, FilePlus, Search } from 'lucide-react';
import { AppLayout } from '@/components/nch/AppLayout';
import { Button } from '@/components/nch/ui';

export default function SubmissionConfirmation() {
  const { state } = useLocation();
  const docket = state?.docket ?? 'NCH/----/XX/0000000';
  const subject = state?.subject ?? 'Your complaint';
  const company = state?.company ?? 'the company';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white border border-slate-200 rounded text-center px-8 py-10">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="text-base font-semibold text-slate-900 mb-1">Complaint Registered Successfully</h1>
          <p className="text-sm text-slate-500 mb-6">
            Your grievance has been received. Please note your docket number for future reference.
          </p>

          {/* Docket Number */}
          <div className="bg-nch-blue-50 border border-nch-blue-200 rounded p-4 mb-6">
            <p className="text-xs text-nch-blue-600 font-medium mb-1 uppercase tracking-wide">Docket Number</p>
            <p className="text-xl font-mono font-bold text-nch-blue-800">{docket}</p>
            <p className="text-xs text-nch-blue-500 mt-2">Save this number to track your complaint status</p>
          </div>

          {/* Next steps */}
          <div className="text-left bg-slate-50 border border-slate-200 rounded p-4 mb-6 space-y-3">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">What happens next?</p>
            {[
              { n: 1, text: 'An NCH officer will review your complaint within 1–2 working days.' },
              { n: 2, text: `Your complaint will be forwarded to ${company} with a response deadline.` },
              { n: 3, text: 'You will be notified when the company responds.' },
              { n: 4, text: 'You can confirm resolution or dispute the response from your dashboard.' },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="h-5 w-5 rounded-full bg-nch-blue-100 text-nch-blue-700 flex items-center justify-center font-semibold shrink-0 text-xs">{step.n}</span>
                {step.text}
              </div>
            ))}
          </div>

          {/* Complaint summary */}
          <div className="text-left mb-6 text-sm text-slate-600 space-y-1.5">
            <p><span className="text-slate-400 text-xs">Subject: </span>{subject}</p>
            <p><span className="text-slate-400 text-xs">Company: </span>{company}</p>
            <p><span className="text-slate-400 text-xs">Registered: </span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/consumer/complaints">
              <Button variant="primary" icon={<Search size={15} />}>Track My Complaints</Button>
            </Link>
            <Link to="/consumer/register">
              <Button variant="outline" icon={<FilePlus size={15} />}>Register Another</Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            An acknowledgement has been sent to your registered email address (prototype — no actual email is sent).
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
