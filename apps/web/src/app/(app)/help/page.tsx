'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Scale,
  Users,
  Wallet,
} from 'lucide-react';
import { Card } from '@muhami/ui';
import { useAuth } from '@/lib/auth-context';

const GUIDES = [
  {
    id: 'clients',
    title: 'Add client',
    icon: Users,
    href: '/clients',
    permission: 'client:read.all' as const,
    steps: [
      'Open Clients and choose New client.',
      'Enter a name and mobile number. Other details are optional and can be completed later.',
      'Save the file. You can now select this client for a case, transaction or WhatsApp message.',
    ],
  },
  {
    id: 'cases',
    title: 'Record case',
    icon: Scale,
    href: '/cases',
    permissions: ['case:read.all', 'case:read.own'] as const,
    steps: [
      'Choose New case and enter its number, court and type.',
      'Choose the client and responsible lawyer. You can add either from the form without leaving it.',
      'Save the case, then open its file to add hearings, documents and fees.',
    ],
  },
  {
    id: 'transactions',
    title: 'Record a transaction',
    icon: ClipboardList,
    href: '/transactions',
    permission: 'transaction:read' as const,
    steps: [
      'Choose Add transaction for work with a department or authority, such as property registration.',
      'Enter the transaction type and department, then choose the client and responsible lawyer.',
      'Save it. Use Transaction documents to add papers and mark it Completed when finished.',
    ],
  },
  {
    id: 'finance',
    title: 'Fees and payments',
    icon: Wallet,
    href: '/finance',
    permission: 'finance:read.summary' as const,
    steps: [
      'Open Finance and choose Add fees. Create an independent account or select an existing client, case or transaction.',
      'Record the agreed fees, then choose Record a payment when money is received. The balance updates and a receipt can be issued.',
      'Record expenses for the office or a file. Client expenses remain separate from fees. Review activity in the statement and use file details to print receipts or correct entries with a recorded reason.',
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp message with an attachment',
    icon: MessageCircle,
    href: '/whatsapp',
    permission: 'whatsapp:read' as const,
    steps: [
      'First, open WhatsApp and Office number. Scan the QR code using Linked devices on the phone, then wait for Connected.',
      'In Messages, choose a client or lawyer, write the message and attach a file if needed.',
      'Review the recipient, number and attachment before sending. Follow the message status in the history. Pending means it has not been sent yet.',
    ],
  },
  {
    id: 'calendar',
    title: 'Appointments and tasks',
    icon: CalendarDays,
    href: '/calendar',
    permissions: ['event:read.all', 'event:read.own'] as const,
    steps: [
      'Record court hearings from the case file and general appointments from the calendar.',
      'Use Tasks for work to complete, such as preparing a letter, following a notice or collecting a document.',
      "Today's commitments appear on the dashboard. Opening an appointment takes you to its day or linked case.",
    ],
  },
];
const SECTION_NAMES: Record<string, string> = {
  clients: 'Clients',
  cases: 'Cases',
  transactions: 'Transactions',
  finance: 'Fees and payments',
  whatsapp: 'Office WhatsApp',
  calendar: 'Calendar',
};
const QUESTIONS = [
  [
    'Case or transaction?',
    'A case is registered with a court and has a number and hearings. A transaction follows work with a department or authority, with a type, department, assigned lawyer and completion status.',
  ],
  [
    'How do I add a missing court?',
    'When choosing a case court, use Add court if you have permission, then enter its name and type.',
  ],
  [
    'How do I add a document?',
    'Open the case, transaction or client file and choose Documents. Selecting the file first keeps the document in the right place.',
  ],
  [
    'How do automatic messages work?',
    'Administration opens Automatic messages, selects an event, writes and enables the template, then saves. It runs for new events using the same office number. Document update notifications are text messages; send the file itself from Messages when needed.',
  ],
  [
    'Can a newly added lawyer sign in?',
    'The lawyer file stores details and assignments. To give access, create a user account, link it to the lawyer and choose suitable permissions.',
  ],
  [
    'What if the internet or WhatsApp disconnects?',
    'Wait for the connection and check the operation or message status before repeating it. Pending changes shows offline edits. Check uncertain WhatsApp messages before sending again.',
  ],
  [
    'Does the calendar sync directly with Google or Outlook?',
    'Download an events file from the calendar and import it into Google or Outlook. It is a snapshot; export again for later changes.',
  ],
  [
    'Why is an add or edit button missing?',
    'Buttons depend on account permissions. Ask office administration if your work needs more access.',
  ],
];

export default function HelpPage() {
  const { can } = useAuth();
  const guides = GUIDES.filter((guide) =>
    guide.permission
      ? can(guide.permission)
      : guide.permissions.some((permission) => can(permission)),
  );
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-brand"
        >
          <ArrowRight className="size-4" aria-hidden />
          Dashboard
        </Link>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <BookOpen className="size-6 text-brand" aria-hidden />
          User guide
        </h1>
        <p className="text-sm leading-7 text-ink-muted">
          Choose the work you want to complete. Each guide opens the right place and explains its
          main steps.
        </p>
      </header>
      <Card id="daily-work" className="scroll-mt-24 border-brand/25 p-4 sm:p-5">
        <h2 className="font-semibold text-ink">The office work journey</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            'Client: record their details once.',
            'Case or transaction: choose the client and lawyer.',
            'Follow-up: documents, dates, fees and messages.',
          ].map((text, index) => (
            <li key={text} className="flex gap-2 text-sm leading-7 text-ink-muted">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-semibold text-brand"
                aria-hidden
              >
                {['1', '2', '3'][index]}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </Card>
      <nav aria-label="Help topics" className="flex flex-wrap gap-2">
        {guides.map((guide) => (
          <a
            key={guide.id}
            href={'#' + guide.id}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-brand-subtle"
          >
            <guide.icon className="size-4 text-brand" aria-hidden />
            {guide.title}
          </a>
        ))}
      </nav>
      <div className="grid gap-4 lg:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.id} id={guide.id} className="scroll-mt-24 space-y-3 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <guide.icon className="size-5 text-brand" aria-hidden />
              {guide.title}
            </h2>
            <ol className="space-y-3">
              {guide.steps.map((step, index) => (
                <li key={step} className="flex gap-2.5 text-sm leading-7 text-ink-muted">
                  <span className="shrink-0 font-semibold text-brand" aria-hidden>
                    {['1', '2', '3'][index]}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <Link
              href={guide.href}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Open {SECTION_NAMES[guide.id]}
            </Link>
          </Card>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Frequently asked questions</h2>
        {QUESTIONS.map(([title, text]) => (
          <details key={title} className="rounded-xl border border-line bg-surface p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">{title}</summary>
            <p className="mt-3 text-sm leading-7 text-ink-muted">{text}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
