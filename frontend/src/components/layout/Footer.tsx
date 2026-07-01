import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin } from 'lucide-react';

export const Footer: React.FC = () => (
  <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">ES</span>
            </div>
            <span className="font-display font-bold text-lg text-gray-900 dark:text-white">EventSphere</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            The premium event management platform for modern organizers and attendees.
          </p>
          <div className="flex gap-3 mt-4">
            {[Github, Twitter, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Platform</h4>
          <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            {['Browse Events', 'Create Event', 'Analytics', 'Pricing'].map(item => (
              <li key={item}><Link to="/events" className="hover:text-brand-500 transition-colors">{item}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            {['About', 'Blog', 'Careers', 'Contact'].map(item => (
              <li key={item}><a href="#" className="hover:text-brand-500 transition-colors">{item}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map(item => (
              <li key={item}><a href="#" className="hover:text-brand-500 transition-colors">{item}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-400">© 2026 EventSphere. All rights reserved.</p>
        <p className="text-sm text-gray-400">Built with ❤️ for event creators</p>
      </div>
    </div>
  </footer>
);
