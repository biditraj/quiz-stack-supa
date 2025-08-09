import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Trophy, 
  Brain, 
  LogOut, 
  Sun, 
  Moon, 
  Computer,
  UserCog,
  Menu
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Navbar = () => {
  const { user, signOut, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/', label: 'Home', icon: null },
    { path: '/quiz', label: 'Quiz', icon: Brain, protected: true },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy, protected: true },
  ];

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 glass-light border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm dark:shadow-gray-900/20"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile menu trigger + Logo */}
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu" className="dark-button focus-ring">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] sm:max-w-sm p-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <SheetHeader>
                      <SheetTitle>
                        <Link to="/" className="inline-flex items-center gap-2">
                          <span className="inline-grid place-items-center rounded-lg p-2 text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md">
                            <Brain className="w-5 h-5" />
                          </span>
                          <span className="dark-text font-semibold">QuizMaster</span>
                        </Link>
                      </SheetTitle>
                    </SheetHeader>
                  </div>
                  {user && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm shadow-sm">
                          {getInitials(user.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate max-w-[22ch] dark-text">{user.user_metadata?.username || user.email}</div>
                        <div className="text-xs dark-text-muted truncate max-w-[22ch]">{user.email}</div>
                      </div>
                    </div>
                  )}
                  <nav className="px-2 py-2">
                    <ul className="space-y-1">
                      {navItems.map((item) => {
                        if (item.protected && !user) return null;
                        const Icon = item.icon;
                        return (
                          <li key={item.path}>
                            <SheetClose asChild>
                              <Link
                                to={item.path}
                                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 dark-text-secondary hover:dark-text focus-ring"
                              >
                                {Icon && <Icon className="w-4 h-4" />}
                                <span>{item.label}</span>
                              </Link>
                            </SheetClose>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                  <div className="px-2 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                    {/* Theme quick actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 dark-button focus-ring" onClick={() => setTheme('light')}>Light</Button>
                      <Button variant="outline" className="flex-1 dark-button focus-ring" onClick={() => setTheme('dark')}>Dark</Button>
                      <Button variant="outline" className="flex-1 dark-button focus-ring" onClick={() => setTheme('system')}>Auto</Button>
                    </div>
                    {user ? (
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <SheetClose asChild>
                            <Button asChild variant="secondary" className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus-ring">
                              <Link to="/admin/profile">Admin</Link>
                            </Button>
                          </SheetClose>
                        )}
                        <Button onClick={handleSignOut} variant="destructive" className="flex-1 focus-ring">Sign Out</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <SheetClose asChild>
                          <Button asChild variant="outline" className="flex-1 dark-button focus-ring">
                            <Link to="/login">Sign In</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button asChild className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md focus-ring">
                            <Link to="/signup">Get Started</Link>
                          </Button>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <Link to="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 rounded-lg shadow-md"
              >
                <Brain className="w-6 h-6" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                QuizMaster
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              if (item.protected && !user) return null;
              
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <motion.div key={item.path} whileHover={{ scale: 1.05 }}>
                  <Link
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 focus-ring ${
                      isActive
                        ? 'bg-blue-500 text-white shadow-lg dark:shadow-blue-500/25'
                        : 'dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 hover:dark-text'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            {/* Hide actions except theme on very small screens to reduce clutter; mobile menu contains full list */}
            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 dark-button focus-ring">
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/50">
                <DropdownMenuItem onClick={() => setTheme("light")} className="dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring">
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring">
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring">
                  <Computer className="mr-2 h-4 w-4" />
                  <span>System</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center space-x-2 focus-ring"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm shadow-sm">
                          {getInitials(user.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/50">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium dark-text">
                        {user.user_metadata?.username || user.email}
                      </p>
                      <p className="text-xs dark-text-muted">
                        {user.email}
                      </p>
                    </div>
                    
                    {isAdmin && (
                      <>
                        <DropdownMenuItem asChild className="dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring">
                          <Link to="/admin/profile" className="flex items-center">
                            <UserCog className="mr-2 h-4 w-4" />
                            <span>Admin Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                      </>
                    )}
                    
                    <DropdownMenuItem onClick={handleSignOut} className="dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex dark-button focus-ring">
                  <Link to="/login">Sign In</Link>
                </Button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild size="sm" className="hidden md:inline-flex bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md focus-ring">
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};


