import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider';
import { ToastProvider } from '@/app/providers/ToastProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { useTheme } from '@/app/providers/ThemeContext';
import { Button } from '@/shared/components/ui/button';
import { ArrowDown, ArrowRight, ArrowUpRight, Code2, Mail, PanelLeftOpen, Sparkles } from 'lucide-react';
import Finance from '@/features/finance';
import Ai from '@/features/ai';
import Jobs from '@/features/ai/pages/JobsPage';
import GoldPrediction from '@/features/gold';
import ResourceWorkspace from '@/features/resources';
import { environment } from '@/shared/config/env';
import { getVisitorId } from '@/shared/utils/visitorId';

interface DailyActivity {
  date: string;
  visits: number;
  uniqueVisitors: number;
}

interface ActivitySummary {
  totalVisits: number;
  totalUniqueVisitors: number;
  daily: DailyActivity[];
}

function ThemeShell() {
  const { dark, setDark } = useTheme();
  return (
    <div className="standalone-shell">
      <VisitTracker />
      <GlobalNavbar dark={dark} setDark={setDark} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/finance/*" element={<Protected><Finance /></Protected>} />
        <Route path="/ai" element={<Ai />} />
        <Route path="/ai/jobs" element={<Jobs />} />
        <Route path="/resources/*" element={<ResourceWorkspace />} />
        <Route path="/playbook" element={<Playbook />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/gold-prediction/:runId?" element={<GoldPrediction />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function VisitTracker() {
  const location = useLocation();
  const previousPath = useRef('');

  useEffect(() => {
    const route = location.pathname;
    if (route === '/login' || previousPath.current === route) return;
    previousPath.current = route;

    const visitorId = getVisitorId();
    void fetch(`${environment.financeApiUrl}/analytics/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route, ...(visitorId ? { visitorId } : {}) }),
    }).then(response => {
      if (!response.ok) throw new Error(`Analytics request failed (${response.status})`);
    }).catch(error => {
      console.warn('Unable to record page visit:', error);
    });
  }, [location.pathname]);

  return null;
}

function GlobalNavbar({ dark, setDark }: { dark: boolean; setDark: React.Dispatch<React.SetStateAction<boolean>> }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [activityError, setActivityError] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!profileOpen) return;
    const controller = new AbortController();
    const loadActivity = async () => {
      try {
        const response = await fetch(`${environment.financeApiUrl}/analytics/summary?days=7`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Activity request failed (${response.status})`);
        const data = await response.json() as ActivitySummary;
        if (!Array.isArray(data.daily)) throw new Error('Activity response was invalid');
        setActivity(data);
        setActivityError('');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setActivityError(error instanceof Error ? error.message : 'Unable to load activity');
      }
    };

    void loadActivity();
    const intervalId = window.setInterval(() => void loadActivity(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800 shadow-xs">
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 shrink-0 group" onClick={closeMobile}>
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white font-bold text-sm shadow-sm ring-2 ring-indigo-500/20 group-hover:scale-105 transition-transform">
              <span>SN</span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900" />
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px] tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Sumanth Nagireddi</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">Architect</span>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal hidden md:block">Senior Full-Stack &amp; Systems</span>
            </div>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/90 dark:border-zinc-700 rounded-full shadow-xs backdrop-blur-md">
          <NavLink to="/" end className={({ isActive }) => `px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'}`}>
            {({ isActive }) => <>{isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}Showcase</>}
          </NavLink>
          <NavLink to="/ai" className={({ isActive }) => `px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'}`}>AI Studio</NavLink>
          <NavLink to="/gold-prediction" className={({ isActive }) => `px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'}`}>Commodity Intel</NavLink>
          <NavLink to="/resources" className={({ isActive }) => `px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'}`}>Resources</NavLink>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span>Available</span>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setDark(v => !v)} className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors shadow-xs">
            <span className="material-symbols-outlined text-[18px] block">{dark ? 'dark_mode' : 'light_mode'}</span>
          </Button>
          <div className="profile-menu-wrap" ref={profileRef}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="profile-trigger"
              aria-label="Open profile and site activity"
              aria-expanded={profileOpen}
              aria-controls="profile-activity-popover"
              onClick={() => setProfileOpen(value => !value)}
            >
              <img alt="" src="/image.jpg" />
            </Button>
            {profileOpen && (
              <section className="profile-popover" id="profile-activity-popover" aria-label="Profile and live site activity">
                <div className="profile-popover-heading">
                  <img alt="" src="/image.jpg" />
                  <div><strong>Sumanth Nagireddi</strong><span>Personal workspace</span></div>
                </div>
                <Link to="/finance" className="profile-finance-link" onClick={() => setProfileOpen(false)}>
                  <span><strong>Finance OS</strong><small>Open your private workspace</small></span>
                  <ArrowUpRight size={16} />
                </Link>
                <div className="profile-activity">
                  <div className="profile-activity-heading">
                    <span><i /> Live site activity</span>
                    <small>Last 7 days</small>
                  </div>
                  {activityError ? (
                    <p className="profile-activity-message error">{activityError}</p>
                  ) : !activity ? (
                    <p className="profile-activity-message">Loading activity…</p>
                  ) : (
                    <>
                      <div className="profile-activity-totals">
                        <div><strong>{activity.totalUniqueVisitors}</strong><span>Unique visitors</span></div>
                        <div><strong>{activity.totalVisits}</strong><span>Total visits</span></div>
                      </div>
                      <div className="profile-activity-days">
                        {activity.daily.map(day => (
                          <div key={day.date}>
                            <span>{new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                            <strong>{day.uniqueVisitors} <small>unique</small></strong>
                            <strong>{day.visits} <small>visits</small></strong>
                          </div>
                        ))}
                      </div>
                      <p className="profile-activity-footnote">Anonymous browser IDs · refreshes every 30 seconds</p>
                    </>
                  )}
                </div>
              </section>
            )}
          </div>
          <Button type="button" variant="outline" size="icon" className="lg:hidden p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shadow-xs" aria-label="Toggle navigation menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>
            <span className="material-symbols-outlined text-[20px] block">{mobileOpen ? 'close' : 'menu'}</span>
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex flex-col gap-1" aria-label="Mobile navigation">
          <NavLink to="/" end onClick={closeMobile} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>Showcase</NavLink>
          {window.location.pathname.startsWith('/resources') && (
            <button
              type="button"
              className="mobile-resource-curriculum-link"
              onClick={() => {
                window.dispatchEvent(new Event('course:open-mobile-sidebar'));
                closeMobile();
              }}
            >
              <PanelLeftOpen size={17} /> Open resource curriculum
            </button>
          )}
          <NavLink to="/ai" onClick={closeMobile} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>AI Studio</NavLink>
          <NavLink to="/gold-prediction" onClick={closeMobile} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>Commodity Intel</NavLink>
          <NavLink to="/resources" onClick={closeMobile} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>Resources</NavLink>
          <a href="https://github.com/" target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">GitHub</a>
          <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">LinkedIn</a>
        </nav>
      )}
    </header>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="standalone-loading">Loading workspace…</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  if (isAuthenticated) return <Navigate to="/finance" replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await login(username, password);
    if (result.success) navigate('/finance');
    else setError(result.error || 'Login failed');
  }
  return (
    <main className="login-page">
      <form onSubmit={submit} className="login-card">
        <span className="login-mark">SN</span>
        <p>Private workspace</p><h1>Sign in to Finance</h1>
        {error && <div className="login-error">{error}</div>}
        <label>Username<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}

function Home() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.portfolio-home');
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const targets = root.querySelectorAll<HTMLElement>('.portfolio-shell > section, .portfolio-work-card, .portfolio-footer');
    root.classList.add('portfolio-reveal-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

    targets.forEach(target => observer.observe(target));
    return () => {
      observer.disconnect();
      root.classList.remove('portfolio-reveal-ready');
    };
  }, []);

  return (
    <main className="portfolio-home">
      <div className="portfolio-shell">
        <section className="portfolio-hero" aria-labelledby="portfolio-title">
          <div className="portfolio-hero-copy">
            <div className="portfolio-eyebrow"><span className="portfolio-live-dot" /> FULL-STACK ENGINEER <span className="portfolio-eyebrow-divider">/</span> HYDERABAD, INDIA</div>
            <h1 id="portfolio-title">I build digital products that make <span>complex work feel simple.</span></h1>
            <p className="portfolio-lede">I’m Sumanth — a product-minded engineer who connects thoughtful design, reliable systems, and practical AI to ship experiences people love using.</p>
            <div className="portfolio-hero-actions">
              <a className="portfolio-button portfolio-button-dark" href="mailto:you@example.com">Let’s work together <ArrowUpRight size={17} /></a>
              <a className="portfolio-text-link" href="#selected-work">Explore my work <ArrowDown size={15} /></a>
            </div>
            <div className="portfolio-hero-footnote"><span><Code2 size={15} /> From first sketch to production</span><span>Open to meaningful opportunities</span></div>
          </div>
          <div className="portfolio-portrait-wrap">
            <div className="portfolio-portrait-glow" aria-hidden="true" />
            <div className="portfolio-portrait-frame">
              <img src="/image.jpg" alt="Portrait of Sumanth Nagireddi" />
              <span className="portfolio-portrait-index">SN—01</span>
            </div>
            <div className="portfolio-float-card portfolio-location-card"><span className="portfolio-card-icon"><Sparkles size={16} /></span><span><strong>Engineering with intent</strong><small>Good work, built to last.</small></span></div>
            <div className="portfolio-float-card portfolio-stack-card"><span className="portfolio-stack-mark">TS</span><span><strong>TypeScript-first</strong><small>React · Node · NestJS</small></span></div>
          </div>
          <a className="portfolio-scroll-cue" href="#selected-work" aria-label="Scroll to selected work"><span /> SCROLL TO EXPLORE</a>
        </section>

        <section className="portfolio-proof" aria-label="At a glance">
          <div className="portfolio-proof-intro">A little about<br />how I work</div>
          <div><strong>End to end</strong><span>Own the whole product journey</span></div>
          <div><strong>Systems minded</strong><span>Build for clarity and scale</span></div>
          <div><strong>People first</strong><span>Make technology feel human</span></div>
        </section>

        <section className="portfolio-work-section" id="selected-work">
          <div className="portfolio-section-heading">
            <div><span className="portfolio-section-index">01 / SELECTED WORK</span><h2>Built to be useful.<br /><span>Designed to feel right.</span></h2></div>
            <p>A few corners of my engineering world — each one shaped around a real workflow, a clear purpose, and the details that make it work.</p>
          </div>
          <div className="portfolio-work-grid">
            <Link to="/ai" className="portfolio-work-card portfolio-work-ai">
              <div className="portfolio-work-top"><span>01 — INTELLIGENCE</span><ArrowUpRight size={18} /></div>
              <div className="portfolio-work-art portfolio-ai-art" aria-hidden="true"><div className="portfolio-ai-orbit orbit-a" /><div className="portfolio-ai-orbit orbit-b" /><div className="portfolio-ai-core"><Sparkles size={25} /></div><span className="portfolio-ai-caption">A better kind of conversation</span></div>
              <div className="portfolio-work-info"><div><h3>AI Studio</h3><p>Practical AI experiences for thinking, creating, and getting work done.</p></div><span className="portfolio-work-arrow"><ArrowRight size={17} /></span></div>
              <div className="portfolio-work-tags"><span>AI workflows</span><span>Product thinking</span><span>React</span></div>
            </Link>
            <Link to="/resources" className="portfolio-work-card portfolio-work-knowledge">
              <div className="portfolio-work-top"><span>02 — KNOWLEDGE SYSTEM</span><ArrowUpRight size={18} /></div>
              <div className="portfolio-work-art portfolio-knowledge-art" aria-hidden="true"><div className="portfolio-note note-one"><span>01</span><i /><i /><i /></div><div className="portfolio-note note-two"><span>02</span><i /><i /></div><div className="portfolio-note note-three"><span>03</span><i /><i /><i /></div><div className="portfolio-note-label">Knowledge, connected.</div></div>
              <div className="portfolio-work-info"><div><h3>Engineering Notebook</h3><p>A living library for ideas, technical notes, and knowledge worth keeping.</p></div><span className="portfolio-work-arrow"><ArrowRight size={17} /></span></div>
              <div className="portfolio-work-tags"><span>Confluence</span><span>Documentation</span><span>Developer experience</span></div>
            </Link>
            <Link to="/gold-prediction" className="portfolio-work-card portfolio-work-markets">
              <div className="portfolio-work-top"><span>03 — MARKET INTELLIGENCE</span><ArrowUpRight size={18} /></div>
              <div className="portfolio-work-art portfolio-market-art" aria-hidden="true"><span className="portfolio-market-label">GOLD / 24K</span><strong>₹ 9,842<span>.60</span></strong><div className="portfolio-market-chart"><svg viewBox="0 0 360 112" preserveAspectRatio="none"><defs><linearGradient id="portfolio-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".22" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><path d="M0 94 C30 90 35 68 60 75 S94 42 122 56 S160 68 188 42 S224 54 250 31 S283 44 304 18 S338 30 360 8 L360 112 L0 112Z" fill="url(#portfolio-chart-fill)" /><path d="M0 94 C30 90 35 68 60 75 S94 42 122 56 S160 68 188 42 S224 54 250 31 S283 44 304 18 S338 30 360 8" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg></div><span className="portfolio-market-tag">LIVE FORECAST · AI ASSISTED</span></div>
              <div className="portfolio-work-info"><div><h3>Commodity Intel</h3><p>Make market movement easier to read with forecast-led insights.</p></div><span className="portfolio-work-arrow"><ArrowRight size={17} /></span></div>
              <div className="portfolio-work-tags"><span>Forecasting</span><span>Data products</span><span>AI-assisted</span></div>
            </Link>
          </div>
        </section>

        <section className="portfolio-about" id="about">
          <div className="portfolio-about-aside"><span className="portfolio-section-index">02 / THE APPROACH</span><div className="portfolio-about-stamp">MAKE<br />IT<br /><em>MATTER.</em></div></div>
          <div className="portfolio-about-copy"><p className="portfolio-about-kicker">Engineering is a team sport.</p><h2>Good software is more than code. It’s <span>clear thinking, good taste, and care for the people on the other side.</span></h2><p>I work across the stack — from shaping the problem and designing the system to building the interface, shipping the API, and making sure the details hold up in production.</p><div className="portfolio-skill-row"><span>Product-minded</span><span>Full-stack</span><span>Systems design</span><span>AI-native</span></div></div>
        </section>

        <section className="portfolio-toolkit" id="toolkit">
          <div className="portfolio-section-heading">
            <div><span className="portfolio-section-index">03 / THE TOOLKIT</span><h2>The right tools.<br /><span>Thoughtfully applied.</span></h2></div>
            <p>I like choosing technology to fit the problem — keeping the stack understandable, the interfaces useful, and the system ready to evolve.</p>
          </div>
          <div className="portfolio-toolkit-grid">
            <article className="portfolio-toolkit-card">
              <span className="portfolio-toolkit-number">01</span>
              <h3>Product interfaces</h3>
              <p>Clear, responsive experiences that make complex workflows easier to use.</p>
              <div><span>React</span><span>TypeScript</span><span>Design systems</span></div>
            </article>
            <article className="portfolio-toolkit-card">
              <span className="portfolio-toolkit-number">02</span>
              <h3>Reliable services</h3>
              <p>Practical APIs and backend foundations built around the needs of the product.</p>
              <div><span>Node.js</span><span>NestJS</span><span>API design</span></div>
            </article>
            <article className="portfolio-toolkit-card">
              <span className="portfolio-toolkit-number">03</span>
              <h3>Connected systems</h3>
              <p>Thoughtful integration across data, tools, and the people who depend on them.</p>
              <div><span>Systems thinking</span><span>AI workflows</span><span>Documentation</span></div>
            </article>
          </div>
        </section>

        <section className="portfolio-principles" id="principles">
          <div className="portfolio-principles-heading">
            <span className="portfolio-section-index">04 / WHAT MATTERS</span>
            <h2>Details add up<br /><span>to trust.</span></h2>
          </div>
          <div className="portfolio-principles-grid">
            <article><span>01</span><h3>Clarity over cleverness</h3><p>Make the product and the code easier for the next person to understand.</p></article>
            <article><span>02</span><h3>Useful by design</h3><p>Start with the real workflow, then make every interaction earn its place.</p></article>
            <article><span>03</span><h3>Ship, learn, improve</h3><p>Deliver in thoughtful steps, listen to what happens, and keep making it better.</p></article>
          </div>
        </section>

        <section className="portfolio-career" id="experience">
          <div className="portfolio-career-heading"><span className="portfolio-section-index">05 / THE JOURNEY</span><h2>Good teams.<br /><span>Hard problems.</span></h2></div>
          <div className="portfolio-career-list">
            <article><span className="portfolio-career-date">2024 — NOW</span><div><h3>EPAM Systems</h3><p>Full-stack Developer · Enterprise applications, architecture, and production-quality delivery.</p></div><span className="portfolio-career-number">03</span></article>
            <article><span className="portfolio-career-date">2024</span><div><h3>Nagarro</h3><p>Full-stack Developer · Enterprise product delivery and modern application patterns.</p></div><span className="portfolio-career-number">02</span></article>
            <article><span className="portfolio-career-date">2021 — 2024</span><div><h3>Infosys</h3><p>Full-stack Developer · Business-critical applications and reusable component systems.</p></div><span className="portfolio-career-number">01</span></article>
          </div>
        </section>

        <section className="portfolio-contact" id="contact">
          <div className="portfolio-contact-orb" aria-hidden="true" />
          <span className="portfolio-section-index">06 / YOUR NEXT BIG IDEA</span>
          <h2>Let’s make<br /><em>something matter.</em></h2>
          <p>Have an ambitious product, a tricky system, or a team that cares about doing things well? I’d love to hear about it.</p>
          <div className="portfolio-contact-actions"><a className="portfolio-button portfolio-button-light" href="mailto:you@example.com"><Mail size={16} /> Start a conversation <ArrowUpRight size={17} /></a><a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><span className="portfolio-linkedin-mark" aria-hidden="true">in</span></a><a href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub"><Code2 size={18} /></a></div>
          <span className="portfolio-contact-signature">Sumanth Nagireddi · Hyderabad, India</span>
        </section>
      </div>
      <footer className="portfolio-footer"><Link to="/" className="portfolio-footer-brand">SN<span>.</span></Link><span>Built with intention, shipped with care.</span><span>© 2026 Sumanth Nagireddi</span></footer>
    </main>
  );
}

function Resources() {
  const { '*': pagePath } = useParams();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('resource-completed-pages') || '[]');
      return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
    } catch {
      return new Set();
    }
  });

  const sections = [
    {
      id: 'getting-started', title: 'Engineering Guides', type: 'space', pages: [
        { id: 'quick-start', title: 'Quick start' },
        { id: 'project-layout', title: 'Project layout' },
      ]
    },
    {
      id: 'interview-preparation', title: 'Interview preparation', type: 'folder', pages: [
        { id: 'javascript', title: 'JavaScript fundamentals' },
        { id: 'react-patterns', title: 'React patterns' },
        { id: 'system-design', title: 'System design' },
      ]
    },
  ];
  const allPages = sections.flatMap(section => section.pages);
  const selected = allPages.find(page => page.id === pagePath) ?? allPages[0];
  const progress = Math.round((completed.size / allPages.length) * 100);

  useEffect(() => {
    localStorage.setItem('resource-completed-pages', JSON.stringify([...completed]));
  }, [completed]);

  useEffect(() => {
    if (!pagePath) navigate('/resources/quick-start', { replace: true });
  }, [navigate, pagePath]);

  function completePage() {
    setCompleted(current => {
      const next = new Set(current);
      next.add(selected.id);
      return next;
    });
    const index = allPages.findIndex(page => page.id === selected.id);
    if (index >= 0 && index < allPages.length - 1) navigate(`/resources/${allPages[index + 1].id}`);
  }

  const descriptions: Record<string, string> = {
    'quick-start': 'A practical starting point for building clean, maintainable applications.',
    'project-layout': 'Structure an application so modules remain clear as the codebase grows.',
    javascript: 'Core language concepts, execution behavior, and interview patterns.',
    'react-patterns': 'Reusable component patterns for predictable React applications.',
    'system-design': 'Architecture fundamentals for scalable, reliable web systems.',
  };

  return (
    <div className="resources-theme-root docs-root">
      <header className="resources-docs-header">
        <button type="button" className="resources-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open sidebar">☰</button>
        <Link to="/resources" className="resources-docs-brand" aria-label="Interview Resources">
          <span className="resources-brand-mark" aria-hidden="true"><span /><span /></span>
          <span className="resources-brand-name">Resources</span>
        </Link>
        <div className="resources-docs-header-spacer" />
        <button className="resources-docs-search" type="button" title="Search resources" aria-label="Search resources">
          <span>⌕</span><span>Navigation</span>
        </button>
      </header>
      <div className="resources-main-row">
        <aside className={`resources-sidebar sidebar-desktop ${mobileOpen ? 'mobile-open' : ''}`}>
          {mobileOpen && <button type="button" className="resources-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close sidebar">×</button>}
          <div className="resources-progress">
            <div className="resources-progress-top"><span>Learning progress</span><strong>{progress}%</strong></div>
            <div className="resources-progress-track"><span style={{ width: `${progress}%` }} /></div>
          </div>
          <nav aria-label="Resource pages">
            {sections.map(section => (
              <div className="resources-sidebar-section" key={section.id}>
                <div className="resources-sidebar-title"><span>{section.type === 'space' ? '⌘' : '▾'}</span><strong>{section.title}</strong></div>
                {section.pages.map(page => (
                  <Link
                    key={page.id}
                    to={`/resources/${page.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`resources-sidebar-page ${selected.id === page.id ? 'active' : ''}`}
                  >
                    <span className="resources-page-status">{completed.has(page.id) ? '✓' : '○'}</span>
                    <span>{page.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <section className="docs-editor-shell">
          <div className="docs-actionbar">
            <div className="docs-breadcrumb">Resources <span>/</span> <strong>{selected.title}</strong></div>
            <div className="docs-actions">
              <button type="button" className="docs-save-button" onClick={() => localStorage.setItem(`resource-page-${selected.id}`, 'saved')}>Save</button>
              <button type="button" className="docs-complete-button" onClick={completePage}>{completed.has(selected.id) ? 'Completed' : 'Mark complete'}</button>
            </div>
          </div>
          <div className="docs-editor-scroll">
            <div className="docs-article-layout">
              <article className="docs-article">
                <header className="docs-article-header">
                  <h1>{selected.title}</h1>
                  <p>{descriptions[selected.id] ?? 'Practical engineering guidance and interview preparation material.'}</p>
                  <button type="button" className="docs-markdown-button"><span>MD</span><span>Markdown</span></button>
                </header>
                <div className="resources-editor-content">
                  <h2>Overview</h2>
                  <p>Use this documentation area to capture implementation notes, examples, commands, and interview preparation material.</p>
                  <h2>Quick example</h2>
                  <pre><code>{selected.id === 'javascript' ? 'const skills = ["arrays", "closures", "async"];' : 'npm install\nnpm run dev'}</code></pre>
                  <h2>Next steps</h2>
                  <ul><li>Review the core concepts</li><li>Build a small example</li><li>Add tests and edge cases</li></ul>
                </div>
              </article>
              <aside className="docs-toc">
                <div className="docs-toc-inner">
                  <div className="docs-toc-title">On this page</div>
                  <button type="button" className="toc-current">Overview</button>
                  <button type="button">Quick example</button>
                  <button type="button">Next steps</button>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
      {mobileOpen && <button type="button" className="resources-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close sidebar overlay" />}
    </div>
  );
}

function Playbook() {
  return <main className="content-page playbook-page"><p className="section-kicker">Developer playbook</p><h1>Build with confidence</h1><div className="resource-grid"><article><h2>Design</h2><p>Clarify the product goal and technical constraints.</p></article><article><h2>Implement</h2><p>Keep changes small, typed, accessible, and testable.</p></article><article><h2>Verify</h2><p>Build, test, review edge cases, and measure behavior.</p></article></div></main>;
}

function Analytics() {
  return <main className="content-page"><p className="section-kicker">Analytics</p><h1>Workspace analytics</h1><p>Route activity and application usage are available through the connected backend.</p></main>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ThemeProvider>
            <ThemeShell />
          </ThemeProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
