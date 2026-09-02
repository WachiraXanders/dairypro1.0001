import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Milk, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

function ContourHero() {
  // Abstract rolling-hills / contour-line illustration — no literal cows,
  // just topographic lines and soft aurora glow, per the brief.
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* base gradient: obsidian -> deep forest */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#0B0F14] to-[#123524]" />

      {/* aurora glow blobs */}
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-[#22C55E]/20 blur-[110px]" />
      <div className="absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full bg-[#D4A017]/10 blur-[120px]" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] rounded-full bg-[#123524] blur-[100px]" />

      {/* contour lines */}
      <svg className="absolute inset-x-0 bottom-0 w-full h-2/3" viewBox="0 0 800 500" preserveAspectRatio="none" fill="none">
        {[
          { d: 'M0,420 C150,380 250,440 400,400 C550,360 650,420 800,380 L800,500 L0,500 Z', opacity: 0.14 },
          { d: 'M0,450 C180,400 300,460 450,420 C600,380 700,440 800,410 L800,500 L0,500 Z', opacity: 0.18 },
          { d: 'M0,470 C200,430 320,480 480,450 C620,420 720,470 800,450 L800,500 L0,500 Z', opacity: 0.24 },
        ].map((row, i) => (
          <path key={i} d={row.d} fill="#22C55E" opacity={row.opacity} />
        ))}
        {[260, 320, 380].map((y, i) => (
          <path
            key={`line-${i}`}
            d={`M0,${y} C150,${y - 30} 300,${y + 25} 450,${y - 10} C600,${y - 40} 700,${y + 15} 800,${y - 5}`}
            stroke="#22C55E"
            strokeOpacity={0.25 - i * 0.05}
            strokeWidth="1"
            fill="none"
          />
        ))}
      </svg>

      {/* subtle grain/dot texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(#F8FAFC 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
    </div>
  );
}

function SocialButton({ children, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-card/5 hover:bg-card/10 text-[#F8FAFC] text-sm font-medium transition-colors"
    >
      {children}
      {label}
    </button>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      toast.success(mode === 'login' ? 'Welcome back' : 'Account created');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'pl-10 h-11 bg-card/5 border-white/10 text-[#F8FAFC] placeholder:text-[#94A3B8] focus-visible:ring-[#22C55E] focus-visible:ring-offset-0 focus-visible:border-[#22C55E]/50 rounded-xl';

  return (
    <div className="min-h-screen flex bg-[#0B0F14]">
      {/* Left: atmospheric hero, hidden on small screens */}
      <div className="hidden lg:flex lg:w-2/5 relative">
        <ContourHero />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#123524] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
              <Milk className="w-4.5 h-4.5 text-[#F8FAFC]" />
            </div>
            <span className="text-[#F8FAFC] font-semibold text-lg tracking-tight">DairyPro</span>
          </div>

          <div className="max-w-sm">
            <p className="text-[#D4A017] text-xs font-medium tracking-[0.2em] uppercase mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Agricultural Intelligence
            </p>
            <h2 className="text-[#F8FAFC] text-3xl font-bold leading-tight tracking-tight">
              Technology meets the land.
            </h2>
            <p className="text-[#94A3B8] text-sm mt-3 leading-relaxed">
              Herd health, yield, breeding, and finance — unified in one calm, intelligent system built for the modern dairy operation.
            </p>
          </div>

          <p className="text-[#94A3B8]/60 text-xs">© {new Date().getFullYear()} DairyPro. All rights reserved.</p>
        </div>
      </div>

      {/* Right: floating glass card */}
      <div className="flex-1 relative flex items-center justify-center px-4 py-12 lg:bg-gradient-to-br lg:from-[#0B0F14] lg:to-[#0d1620]">
        <div className="lg:hidden absolute inset-0"><ContourHero /></div>

        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-[28px] border border-white/10 bg-card/[0.06] backdrop-blur-2xl shadow-2xl shadow-black/40 p-8 md:p-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#123524] flex items-center justify-center shadow-lg shadow-[#22C55E]/20 mb-4">
                <Milk className="w-6 h-6 text-[#F8FAFC]" />
              </div>
              <h1 className="text-[#F8FAFC] text-2xl font-bold tracking-tight">
                {mode === 'login' ? 'Welcome back' : 'Create your farm'}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1.5">
                {mode === 'login' ? 'Manage your farm with confidence.' : 'Set up the first admin account for your farm.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-[#F8FAFC] text-sm">Full name</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Farmer"
                    className="h-11 bg-card/5 border-white/10 text-[#F8FAFC] placeholder:text-[#94A3B8] focus-visible:ring-[#22C55E] focus-visible:ring-offset-0 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#F8FAFC] text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <Input
                    id="email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@farm.com"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#F8FAFC] text-sm">Password</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => toast.info('Ask a farm admin to reset your password from Settings → Users.')}
                      className="text-xs text-[#94A3B8] hover:text-[#22C55E] transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <Input
                    id="password" type={showPassword ? 'text' : 'password'} required minLength={6}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'login' && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox checked={remember} onCheckedChange={setRemember} className="border-white/20 data-[state=checked]:bg-[#22C55E] data-[state=checked]:border-[#22C55E]" />
                  <span className="text-sm text-[#94A3B8]">Remember me</span>
                </label>
              )}

              {error && <p className="text-sm text-rose-400">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16a34a] hover:opacity-90 text-white font-semibold shadow-lg shadow-[#22C55E]/25 transition-opacity"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-card/10" />
              <span className="text-[10px] uppercase tracking-widest text-[#94A3B8]">or continue with</span>
              <div className="flex-1 h-px bg-card/10" />
            </div>

            <div className="flex gap-3">
              <SocialButton label="Google" onClick={() => toast.info('Social sign-in is not configured for this deployment yet.')}>
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              </SocialButton>
              <SocialButton label="Microsoft" onClick={() => toast.info('Social sign-in is not configured for this deployment yet.')}>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="9" height="9" fill="#F25022" /><rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
                  <rect x="2" y="13" width="9" height="9" fill="#00A4EF" /><rect x="13" y="13" width="9" height="9" fill="#FFB900" />
                </svg>
              </SocialButton>
            </div>

            <button
              type="button"
              className="mt-6 text-sm text-[#94A3B8] hover:text-[#F8FAFC] w-full text-center transition-colors"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            >
              {mode === 'login' ? (
                <>Don't have an account? <span className="text-[#22C55E] font-medium">Create one</span></>
              ) : (
                <>Already have an account? <span className="text-[#22C55E] font-medium">Sign in</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
