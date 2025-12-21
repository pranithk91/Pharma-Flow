import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import {
  LogIn,
  Activity,
  Lock,
  User,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      showToast("Please enter both username and password", "error");
      return;
    }

    setIsLoading(true);
    try {
      await login({ username, password });
      showToast("Welcome back!", "success");
      navigate("/");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500 rounded-full filter blur-[128px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500 rounded-full filter blur-[128px] translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 lg:p-16">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-xl shadow-primary-600/30">
                <Activity size={32} className="text-white" />
              </div>
              <div>
                <h1 className="font-display text-4xl font-bold text-white">
                  PharmaFlow
                </h1>
                <p className="text-primary-400 flex items-center gap-1">
                  <Sparkles size={14} />
                  <span>IMS Pro v2.0</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white leading-tight">
              Modern Inventory
              <br />
              <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">
                Management System
              </span>
            </h2>
            <p className="text-surface-400 text-lg max-w-md leading-relaxed">
              Streamline your pharmacy operations with our comprehensive
              solution for inventory, sales, and patient management.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-surface-50 to-surface-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl">
              <Activity size={24} className="text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-surface-800">
              PharmaFlow
            </span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-surface-200/50 p-8 lg:p-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-500/30">
                <LogIn size={28} className="text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold text-surface-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-surface-500">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="
                      w-full pl-12 pr-4 py-3.5 
                      bg-surface-50 border-2 border-surface-200 
                      rounded-xl text-surface-800 text-sm
                      placeholder:text-surface-400
                      transition-all duration-200
                      hover:border-surface-300
                      focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:bg-white
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    placeholder="Enter your username"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="
                      w-full pl-12 pr-4 py-3.5 
                      bg-surface-50 border-2 border-surface-200 
                      rounded-xl text-surface-800 text-sm
                      placeholder:text-surface-400
                      transition-all duration-200
                      hover:border-surface-300
                      focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:bg-white
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="
                  w-full py-3.5 px-6 
                  bg-gradient-to-r from-primary-600 to-primary-700 
                  hover:from-primary-700 hover:to-primary-800 
                  text-white font-semibold rounded-xl 
                  transition-all duration-200 
                  shadow-lg shadow-primary-600/30
                  hover:shadow-xl hover:shadow-primary-600/40
                  focus:outline-none focus:ring-4 focus:ring-primary-500/30
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
                  active:scale-[0.98]
                  flex items-center justify-center gap-2 group
                "
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-surface-400">
            © 2025 PharmaFlow IMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
