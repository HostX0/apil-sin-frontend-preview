import { redirect } from 'next/navigation';

/** Keep previously shared calendar links usable. */
export default async function CalendarDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  redirect(`/calendar?date=${encodeURIComponent(date)}`);
}
