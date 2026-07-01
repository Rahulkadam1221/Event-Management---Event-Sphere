import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon, ArrowLeft, HelpCircle, User, Mail, Eye, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Switch } from '../components/ui/Switch';
import { Textarea } from '../components/ui/Textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';

export const DesignSystemPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'tokens' | 'buttons' | 'forms' | 'data' | 'overlays'>('tokens');

  // Input states for interaction
  const [inputText, setInputText] = useState('');
  const [selectedRole, setSelectedRole] = useState('ATTENDEE');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [switchValue, setSwitchValue] = useState(true);
  const [textareaValue, setTextareaValue] = useState('');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const mockUsers = [
    { name: 'Sarah Jenkins', email: 'sarah@eventsphere.com', role: 'ORGANIZER', status: 'Active', events: 12 },
    { name: 'Alex Kumar', email: 'alex@eventsphere.com', role: 'ATTENDEE', status: 'Active', events: 4 },
    { name: 'John Doe', email: 'john@eventsphere.com', role: 'ATTENDEE', status: 'Pending', events: 1 },
    { name: 'Sophia Loren', email: 'sophia@eventsphere.com', role: 'ADMIN', status: 'Suspended', events: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f11] text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight">EventSphere Design System</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Visual styleguide & premium component library</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-all duration-200"
              title="Toggle Dark/Light Mode"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/dashboard">
              <Button size="sm">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Tabs */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="flex md:flex-col gap-2 p-1.5 bg-gray-100/70 dark:bg-gray-900/40 rounded-2xl border border-gray-200/50 dark:border-gray-800/40 overflow-x-auto md:overflow-x-visible">
              <button
                onClick={() => setActiveTab('tokens')}
                className={`flex-1 md:flex-none text-left px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'tokens'
                    ? 'bg-white dark:bg-gray-800 text-brand-500 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Design Tokens
              </button>
              <button
                onClick={() => setActiveTab('buttons')}
                className={`flex-1 md:flex-none text-left px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'buttons'
                    ? 'bg-white dark:bg-gray-800 text-brand-500 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Buttons & Badges
              </button>
              <button
                onClick={() => setActiveTab('forms')}
                className={`flex-1 md:flex-none text-left px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'forms'
                    ? 'bg-white dark:bg-gray-800 text-brand-500 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Form Components
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`flex-1 md:flex-none text-left px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'data'
                    ? 'bg-white dark:bg-gray-800 text-brand-500 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Data Tables & Cards
              </button>
              <button
                onClick={() => setActiveTab('overlays')}
                className={`flex-1 md:flex-none text-left px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'overlays'
                    ? 'bg-white dark:bg-gray-800 text-brand-500 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Modals & Overlays
              </button>
            </nav>
          </aside>

          {/* Playground Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'tokens' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Typography */}
                <section className="card p-6 md:p-8 space-y-6">
                  <h2 className="text-xl font-display font-bold border-b border-gray-100 dark:border-gray-800 pb-3">Typography Scale</h2>
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 dark:border-gray-800/50 pb-4">
                      <span className="w-24 text-xs font-mono text-gray-400">H1</span>
                      <h1 className="flex-1 text-4xl sm:text-5xl font-display font-extrabold tracking-tight">Hero Display Heading</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 dark:border-gray-800/50 pb-4">
                      <span className="w-24 text-xs font-mono text-gray-400">H2</span>
                      <h2 className="flex-1 text-3xl sm:text-4xl font-display font-bold">Section Heading Label</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 dark:border-gray-800/50 pb-4">
                      <span className="w-24 text-xs font-mono text-gray-400">H3</span>
                      <h3 className="flex-1 text-2xl font-display font-bold">Card Header Label</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 dark:border-gray-800/50 pb-4">
                      <span className="w-24 text-xs font-mono text-gray-400">H4</span>
                      <h4 className="flex-1 text-xl font-display font-semibold">Subheading Label</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 dark:border-gray-800/50 pb-4">
                      <span className="w-24 text-xs font-mono text-gray-400">H5</span>
                      <h5 className="flex-1 text-lg font-sans font-semibold">Metadata Group Title</h5>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 dark:border-gray-800/50 pb-4">
                      <span className="w-24 text-xs font-mono text-gray-400">Body</span>
                      <p className="flex-1 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                        EventSphere uses <strong className="text-gray-900 dark:text-white">Inter</strong> for readable body copy. It is designed to be highly readable, lightweight, and modern.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline pb-2">
                      <span className="w-24 text-xs font-mono text-gray-400">Muted</span>
                      <p className="flex-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        This is muted caption or description text for details that do not require high visual priority.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Colors */}
                <section className="card p-6 md:p-8 space-y-6">
                  <h2 className="text-xl font-display font-bold border-b border-gray-100 dark:border-gray-800 pb-3">Color Palette</h2>
                  <div className="space-y-6">
                    {/* Brand Colors */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase">Primary Brand Indigo</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                        {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => (
                          <div key={step} className="flex flex-col gap-1.5">
                            <div
                              className="h-12 rounded-lg"
                              style={{ backgroundColor: `var(--brand-${step}, theme('colors.indigo.${step}'))` }}
                            />
                            <div className="text-[10px] font-mono text-center">
                              <span className="block font-semibold">brand-{step}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Surfacing and Neutral Colors */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase">Neutrals & Canvas</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="card p-4 flex items-center justify-between bg-white dark:bg-[#0f0f11]">
                          <span className="text-xs font-medium">Canvas Background</span>
                          <span className="text-xs font-mono text-gray-400">#ffffff / #0f0f11</span>
                        </div>
                        <div className="card p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
                          <span className="text-xs font-medium">Surface/Card</span>
                          <span className="text-xs font-mono text-gray-400">#f9fafb / #18181b</span>
                        </div>
                        <div className="card p-4 flex items-center justify-between border-gray-200 dark:border-gray-800">
                          <span className="text-xs font-medium">Border Edge</span>
                          <span className="text-xs font-mono text-gray-400">#e5e7eb / #27272a</span>
                        </div>
                        <div className="card p-4 flex items-center justify-between bg-gray-950 text-white">
                          <span className="text-xs font-medium">Deep Black</span>
                          <span className="text-xs font-mono text-gray-400">#09090b</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'buttons' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Button Variants */}
                <section className="card p-6 md:p-8 space-y-6">
                  <h2 className="text-xl font-display font-bold border-b border-gray-100 dark:border-gray-800 pb-3">Button Variants</h2>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Button variant="primary">Primary Button</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline Border</Button>
                    <Button variant="ghost">Ghost Button</Button>
                    <Button variant="danger">Danger Action</Button>
                  </div>
                </section>

                {/* Button Sizes */}
                <section className="card p-6 md:p-8 space-y-6">
                  <h2 className="text-xl font-display font-bold border-b border-gray-100 dark:border-gray-800 pb-3">Button Sizes & Icons</h2>
                  <div className="flex flex-wrap gap-4 items-end">
                    <Button size="sm">Small Tag</Button>
                    <Button size="md">Medium Default</Button>
                    <Button size="lg">Large Hero</Button>
                    <Button variant="primary" leftIcon={<User className="w-4 h-4" />}>
                      With Left Icon
                    </Button>
                    <Button variant="outline" rightIcon={<ArrowLeft className="w-4 h-4 rotate-180" />}>
                      With Right Icon
                    </Button>
                    <Button isLoading>Loading State</Button>
                  </div>
                </section>

                {/* Badges */}
                <section className="card p-6 md:p-8 space-y-6">
                  <h2 className="text-xl font-display font-bold border-b border-gray-100 dark:border-gray-800 pb-3">Badge Variants</h2>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="default">Default Gray</Badge>
                    <Badge variant="brand">Brand Indigo</Badge>
                    <Badge variant="success">Success Green</Badge>
                    <Badge variant="info">Info Blue</Badge>
                    <Badge variant="warning">Warning Amber</Badge>
                    <Badge variant="danger">Danger Red</Badge>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'forms' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Form Elements */}
                <section className="card p-6 md:p-8 space-y-6">
                  <h2 className="text-xl font-display font-bold border-b border-gray-100 dark:border-gray-800 pb-3">Form Elements Playground</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Inputs */}
                    <Input
                      label="Username / Name"
                      placeholder="e.g. Sarah Jenkins"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      leftIcon={<User className="w-4 h-4" />}
                      helperText="Type anything to test state values."
                    />

                    <Input
                      label="Disabled Input"
                      placeholder="This field cannot be edited"
                      disabled
                    />

                    {/* Custom Select */}
                    <Select
                      label="User Role Selector"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      options={[
                        { value: 'ATTENDEE', label: 'Attendee (Event Spectator)' },
                        { value: 'ORGANIZER', label: 'Organizer (Event host manager)' },
                        { value: 'ADMIN', label: 'Administrator (Platform executive)' },
                      ]}
                      helperText={`Current Selected Value: ${selectedRole}`}
                    />

                    {/* Textarea */}
                    <Textarea
                      label="Event Description / Biography"
                      placeholder="Write a brief description..."
                      value={textareaValue}
                      onChange={(e) => setTextareaValue(e.target.value)}
                      helperText="Standard description text field."
                    />
                  </div>

                  {/* Toggles */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row gap-8">
                    <Checkbox
                      label="I agree to the Terms of Service & Privacy Policy"
                      checked={checkboxValue}
                      onChange={(e) => setCheckboxValue(e.target.checked)}
                      error={!checkboxValue ? 'Required to proceed' : undefined}
                    />

                    <Switch
                      label="Subscribe to weekly developer updates"
                      checked={switchValue}
                      onCheckedChange={setSwitchValue}
                    />
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'data' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Data Tables */}
                <section className="card p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h2 className="text-xl font-display font-bold">Reusable Table Layout</h2>
                    <span className="text-xs text-gray-400">Total: {mockUsers.length} Users</span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Initials</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Platform Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockUsers.map((user, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Avatar name={user.name} size="sm" />
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-white">
                            {user.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'ADMIN' ? 'danger' : user.role === 'ORGANIZER' ? 'brand' : 'default'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'Active' ? 'success' : user.status === 'Pending' ? 'warning' : 'default'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <button className="p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>

                {/* Cards Grid */}
                <section className="space-y-6">
                  <h3 className="text-lg font-display font-bold">Standard vs Glassmorphic Cards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Standard Card */}
                    <Card className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="brand">Standard Card</Badge>
                        <span className="text-xs text-gray-400">Card.tsx</span>
                      </div>
                      <h4 className="text-lg font-bold">Linear-Style Density</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        A clean card container with default background colors, standard border margins, and responsive layouts.
                      </p>
                      <Button variant="outline" size="sm" className="w-full">Action Button</Button>
                    </Card>

                    {/* Glass Card */}
                    <div className="glass p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="success">Glassmorphic Card</Badge>
                          <span className="text-xs text-gray-400">.glass class</span>
                        </div>
                        <h4 className="text-lg font-bold">Stripe-Style Translucency</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Utilizes background opacity blending layers and premium sub-pixel borders for visual depth overlays.
                        </p>
                      </div>
                      <Button variant="primary" size="sm" className="w-full">Interactive Link</Button>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'overlays' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Modal Triggers */}
                <section className="card p-6 md:p-8 space-y-6 flex flex-col items-center justify-center min-h-[300px]">
                  <HelpCircle className="w-12 h-12 text-brand-500 dark:text-brand-400 animate-pulse" />
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-display font-bold">Modals & Overlays Playground</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                      Click the button below to display the Framer Motion animated modal wrapper in action, featuring responsive widths and keyboard exits.
                    </p>
                  </div>
                  <Button onClick={() => setIsDemoModalOpen(true)}>Open Showcase Modal</Button>
                </section>

                <Modal
                  isOpen={isDemoModalOpen}
                  onClose={() => setIsDemoModalOpen(false)}
                  title="Configure Guest Registration"
                  size="md"
                >
                  <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Fill out the fields below. This action utilizes the custom input and button models dynamically loaded in the overlay layer.
                    </p>
                    <div className="space-y-4">
                      <Input label="Guest Full Name" placeholder="e.g. John Doe" leftIcon={<User className="w-4 h-4" />} />
                      <Input label="Email Address" placeholder="e.g. john@doe.com" leftIcon={<Mail className="w-4 h-4" />} />
                      <Select
                        label="Admission Tier"
                        options={[
                          { value: 'student', label: 'Student Pass (30% off)' },
                          { value: 'general', label: 'General Admission' },
                          { value: 'vip', label: 'VIP Backstage Access' },
                        ]}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 dark:border-gray-800">
                      <Button variant="outline" onClick={() => setIsDemoModalOpen(false)}>Cancel</Button>
                      <Button variant="primary" onClick={() => setIsDemoModalOpen(false)}>Save Settings</Button>
                    </div>
                  </div>
                </Modal>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
