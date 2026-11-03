import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bug,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Sparkles,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { InlineSpinner } from '../components/LoadingSpinner';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      success(`Welcome back, ${user.name}! Signed in as ${user.role}.`);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'TESTER') navigate('/tester');
      else if (user.role === 'DEVELOPER') navigate('/developer');
      else navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-xl shadow-brand-500/25 mb-4">
          <Bug className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          BugTrack <span className="text-brand-400">AI</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Intelligent Bug Lifecycle & Code Change Risk Analysis
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          {import.meta.env.DEV && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  1-Click Demo Accounts
                </span>
                <span className="text-[11px] text-slate-500">Click role to prefill</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin@bugtrack.ai', 'Admin@123')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    email === 'admin@bugtrack.ai'
                      ? 'bg-indigo-950/80 border-indigo-500/80 text-white shadow-sm shadow-indigo-500/30 ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 mb-0.5">
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">admin@bugtrack.ai</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Admin@123</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('tester@bugtrack.ai', 'Tester@123')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    email === 'tester@bugtrack.ai'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-white shadow-sm shadow-emerald-500/30 ring-1 ring-emerald-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    QA Tester
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">tester@bugtrack.ai</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Tester@123</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('developer@bugtrack.ai', 'Developer@123')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    email === 'developer@bugtrack.ai'
                      ? 'bg-sky-950/80 border-sky-500/80 text-white shadow-sm shadow-sky-500/30 ring-1 ring-sky-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 mb-0.5">
                    <Code2 className="w-3.5 h-3.5" />
                    Developer
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">developer@bugtrack.ai</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Developer@123</p>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/30 transition-all duration-200"
            >
              {loading ? (
                <>
                  <InlineSpinner />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to BugTrack AI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Need a new account?{' '}
              <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
