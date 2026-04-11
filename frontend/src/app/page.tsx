'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Shield, BarChart3, Mail, Users, CheckCircle2, Star, Send, Layers, Timer } from 'lucide-react';

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push('/dashboard');
  }, [session, router]);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* Dot background */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.18) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-gray-900 font-black text-lg tracking-tight">ONB</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          <a href="#testimonials" className="hover:text-gray-900 transition-colors">Reviews</a>
        </div>
        <Link href="/login" className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold px-5 py-2 rounded-full transition-colors">
          Get started <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center pt-44 pb-28 px-4">
        <div className="absolute top-48 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-green-400/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-64 left-1/3 w-[300px] h-[300px] bg-emerald-300/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative inline-flex items-center gap-2 mb-7">
          <div className="relative flex items-center gap-2 border border-green-500/40 bg-green-50 text-green-600 text-xs font-semibold px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            The smarter way to run cold email campaigns
          </div>
        </div>

        <h1 className="font-heading text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 max-w-4xl text-gray-900">
          Send thousands of emails.
          <br />
          <span className="bg-gradient-to-r from-green-500 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Zero get lost.
          </span>
        </h1>

        <p className="text-gray-500 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
          Schedule cold email campaigns at scale. Rate-limited, persistent across restarts,
          with a real-time dashboard to track every send.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <Link href="/login" className="group flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-8 py-4 rounded-full text-base transition-all hover:scale-105 shadow-xl shadow-green-500/20">
            Start free with Google
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a href="#how-it-works" className="flex items-center gap-2 border border-gray-200 hover:border-gray-400 text-gray-600 hover:text-gray-900 font-medium px-8 py-4 rounded-full text-base transition-colors">
            See how it works
          </a>
        </div>
        <p className="text-gray-400 text-xs">No credit card &middot; Google OAuth &middot; Takes 10 seconds</p>

        {/* Hero video */}
        <div className="relative mt-20 w-full max-w-5xl mx-auto">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-green-400/30 to-transparent pointer-events-none z-10" />
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-gray-300 border border-gray-200">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 mx-4 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400 text-center">
                app.onb.io/dashboard
              </div>
            </div>
            <video
              src="/onb.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full block"
            />
          </div>
        </div>
      </section>

      {/* TECH BAR */}
      <section className="py-12 px-4 border-y border-gray-100 bg-gray-50">
        <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-8">Built with production-grade infrastructure</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {['BullMQ', 'Redis', 'PostgreSQL', 'Prisma', 'Next.js 14', 'Google OAuth', 'Nodemailer'].map(tech => (
            <span key={tech} className="text-gray-400 text-sm font-semibold hover:text-gray-700 transition-colors cursor-default">{tech}</span>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '1,000+', label: 'Emails per batch', sub: 'Scheduled in under 2s' },
            { value: '200/hr', label: 'Rate limit', sub: 'Global safety cap' },
            { value: '0', label: 'Duplicates', sub: 'Idempotency via BullMQ' },
            { value: 'Auto', label: 'Retry on failure', sub: 'Survives restarts' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-green-300 transition-colors">
              <div className="text-3xl md:text-4xl font-black text-gray-900 mb-1">{stat.value}</div>
              <div className="text-gray-800 text-sm font-semibold mb-0.5">{stat.label}</div>
              <div className="text-gray-400 text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-green-600 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
            <h2 className="font-heading text-4xl md:text-5xl font-black mb-5 text-gray-900">Everything cold outreach needs</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">No shortcuts. No cron jobs. Just a solid, scalable queue that does exactly what you need.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <Zap className="w-5 h-5 text-green-500" />, title: 'BullMQ Scheduling', desc: 'Delayed jobs backed by Redis. Emails survive restarts and never duplicate — guaranteed by idempotency keys.', highlight: true },
              { icon: <Shield className="w-5 h-5 text-green-500" />, title: 'Atomic Rate Limiting', desc: 'Lua scripts enforce global + per-sender limits under concurrency. No race conditions, no overflows.', highlight: false },
              { icon: <Users className="w-5 h-5 text-green-500" />, title: 'Bulk CSV Upload', desc: 'Upload thousands of leads. We parse, validate, and batch-insert everything with a single DB query.', highlight: false },
              { icon: <Timer className="w-5 h-5 text-green-500" />, title: 'Configurable Delay', desc: 'Set delay between sends and hourly caps. Space out 1,000 emails so they never trigger spam filters.', highlight: false },
              { icon: <Layers className="w-5 h-5 text-green-500" />, title: 'File Attachments', desc: 'Attach PDFs, images, and docs. Base64 encoded, stored in Redis per job — never bloats the database.', highlight: false },
              { icon: <BarChart3 className="w-5 h-5 text-green-500" />, title: 'Real-time Dashboard', desc: 'Track every email. Filter by status or date. Cancel, reschedule, or stop all in one click.', highlight: false },
            ].map(f => (
              <div key={f.title} className={`relative rounded-2xl p-6 transition-all group hover:-translate-y-0.5 ${f.highlight ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200' : 'bg-white border border-gray-100 hover:border-gray-200 shadow-sm'}`}>
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors border border-green-100">
                  {f.icon}
                </div>
                <h3 className="text-gray-900 font-bold mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-green-600 text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="font-heading text-4xl md:text-5xl font-black text-gray-900">Three steps to scale</h2>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { step: '01', icon: <Users className="w-5 h-5 text-green-500" />, title: 'Upload your leads', desc: 'Paste a list of emails or drop a CSV. We parse every address and skip invalid ones automatically.', tags: ['CSV upload', 'Bulk paste', 'Validation'] },
              { step: '02', icon: <Mail className="w-5 h-5 text-green-500" />, title: 'Compose your email', desc: 'Write your message, add images or file attachments, set your send time, delay between sends, and hourly cap.', tags: ['Rich HTML', 'Attachments', 'Send Later'] },
              { step: '03', icon: <Zap className="w-5 h-5 text-green-500" />, title: 'We handle the rest', desc: 'BullMQ dispatches each email at the right time. Rate limits are respected. Failed sends are retried. Preview every email in Ethereal.', tags: ['Auto-retry', 'Rate-limited', 'Preview link'] },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-6 bg-white border border-gray-100 rounded-2xl p-7 hover:border-gray-200 hover:shadow-sm transition-all shadow-sm">
                <span className="text-4xl font-black text-gray-100 leading-none flex-shrink-0 pt-1">{s.step}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">{s.icon}</div>
                    <h3 className="text-gray-900 font-bold text-lg">{s.title}</h3>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-3">{s.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.tags.map(t => (
                      <span key={t} className="text-xs text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5 bg-gray-50">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-green-600 text-sm font-semibold uppercase tracking-widest mb-3">Reviews</p>
            <h2 className="font-heading text-4xl md:text-5xl font-black text-gray-900">Trusted by outreach teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: 'Finally a scheduler that does not drop emails on restart. The BullMQ integration is exactly what we needed for our SDR team.', name: 'Marcus T.', role: 'Head of Growth, SaasHQ' },
              { quote: 'Scheduled 5,000 emails in a single batch. The rate limiting worked perfectly — zero bounces from spam filters.', name: 'Priya K.', role: 'Founder, OutreachOS' },
              { quote: 'The Stop Sending + Reschedule feature alone saved us from a botched campaign. Absolute lifesaver.', name: 'Daniel R.', role: 'Marketing Lead, Flowbase' },
            ].map(t => (
              <div key={t.name} className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 hover:border-gray-200 hover:shadow-sm transition-all shadow-sm">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-4 h-4 fill-green-400 text-green-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-gray-900 text-sm font-semibold">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4 text-center relative overflow-hidden bg-white">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] bg-green-100 rounded-full blur-[120px] opacity-60" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-green-200 bg-green-50 text-green-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Free to use &middot; No setup required
          </div>
          <h2 className="font-heading text-4xl md:text-6xl font-black mb-6 leading-tight text-gray-900">
            Start sending smarter
            <br />
            <span className="bg-gradient-to-r from-green-500 to-emerald-400 bg-clip-text text-transparent">today.</span>
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
            Sign in with Google and schedule your first campaign in under a minute.
          </p>
          <Link href="/login" className="group relative inline-flex items-center gap-3 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-10 py-5 rounded-full text-lg transition-all hover:scale-105 shadow-2xl shadow-green-500/25">
            Get started for free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-gray-400 text-xs">
            {['One-click Google login', 'No credit card', 'Cancel anytime'].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 px-8 py-8 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center">
              <Send className="w-3 h-3 text-white" />
            </div>
            <span className="text-gray-900 font-black">ONB</span>
          </div>
          <div className="flex items-center gap-6 text-gray-400 text-xs">
            <a href="#features" className="hover:text-gray-700 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-700 transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-gray-700 transition-colors">Reviews</a>
          </div>
          <span className="text-gray-300 text-xs">&copy; 2026 ONB. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}
