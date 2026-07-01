import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  leftPanelTitle: string;
  leftPanelDesc: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  leftPanelTitle,
  leftPanelDesc,
}) => {
  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0f0f11] text-gray-900 dark:text-gray-100">
      {/* Left panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-600 via-violet-600 to-purple-700">
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/10"
              style={{
                width: `${100 + i * 80}px`,
                height: `${100 + i * 80}px`,
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <Link to="/" className="flex items-center gap-2.5 mb-12 w-fit">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="font-display font-bold text-lg">ES</span>
            </div>
            <span className="font-display font-bold text-2xl">EventSphere</span>
          </Link>
          <h2 className="font-display text-4xl font-black leading-tight mb-6 max-w-md">
            {leftPanelTitle}
          </h2>
          <p className="text-brand-100 text-lg leading-relaxed max-w-md">
            {leftPanelDesc}
          </p>
          <div className="mt-12 space-y-4">
            {['Lightning-fast event creation', 'Secure Razorpay payments', 'Real-time chat & analytics'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</div>
                <span className="text-brand-100 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Form container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          <div>
            <h1 className="font-display text-3xl font-black text-gray-900 dark:text-white mb-2">
              {title}
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </div>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
};
