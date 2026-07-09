"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Compass, Target, User, Shield, LogOut, Users, Trophy, Bell } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/lib/auth-helpers';
import clsx from 'clsx';
import LogActionModal from './LogActionModal';
import { useState, useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { getDate } from '@/lib/dateUtils';

const desktopNav = [
  { name: 'Feed', href: '/feed' },
  { name: 'Map', href: '/map' },
  { name: 'Explore', href: '/explore' },
  { name: 'Challenges', href: '/challenges' },
  { name: 'Clubs', href: '/clubs' },
  { name: 'Leaderboard', href: '/leaderboard' },
];

const mobileNav = [
  { name: 'Feed', href: '/feed', icon: Home },
  { name: 'Map', href: '/map', icon: () => <span className="text-lg">🗺️</span> },
  { name: 'Explore', href: '/explore', icon: Compass },
  { name: 'Challenges', href: '/challenges', icon: Target },
  { name: 'Clubs', href: '/clubs', icon: Users },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function AppLayout({ children }) {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    let unsub;
    try {
      unsub = onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        console.error("Notifications subscription error:", err);
      });
    } catch (e) {
      console.error("Notifications setup error", e);
    }
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleNotifClick = async (notif) => {
    setNotifOpen(false);
    if (!notif.read) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      } catch(e) { console.error('Error updating notif', e); }
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getAvatar = () => {
    if (userProfile?.photoURL) return userProfile.photoURL;
    if (user?.photoURL) return user.photoURL;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${userProfile?.displayName || user?.email || 'User'}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-secondary)] font-sans antialiased animate-in fade-in duration-200 pb-20 md:pb-0">
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          className: 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-lg rounded-[var(--radius-lg)] text-sm font-medium',
          success: { iconTheme: { primary: 'var(--accent)', secondary: 'white' } },
        }}
      />
      
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-default)]">
        <div className="max-w-5xl mx-auto px-4 h-full grid grid-cols-2 md:grid-cols-3 items-center">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href={user ? "/feed" : "/"} className="flex items-center gap-2 transition-[var(--transition)] active:scale-95">
              <span className="text-xl">🌿</span>
              <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">GreenCred</span>
            </Link>
          </div>

          {/* Desktop Links (Center) */}
          <div className="hidden md:flex items-center justify-center gap-6 h-full">
            {desktopNav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    "relative text-sm font-medium transition-[var(--transition)] h-full flex items-center px-1",
                    isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center justify-end gap-3 h-full">
            {user ? (
              <>
                {/* Bell */}
                <div className="relative" ref={notifRef}>
                  <button onClick={() => setNotifOpen(!notifOpen)} className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)] relative">
                    <Bell className="w-5 h-5" />
                    {notifications.some(n => !n.read) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[var(--bg-surface)]"></span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notifOpen && (
                    <div className="absolute top-10 right-0 mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[0_4px_16px_rgba(0,0,0,0.08)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-[var(--border-default)] flex justify-between items-center">
                        <h3 className="font-semibold text-sm text-[var(--text-primary)]">Notifications</h3>
                        <span className="text-xs text-[var(--text-muted)]">{notifications.filter(n=>!n.read).length} new</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto w-full">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-[var(--text-muted)]">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => handleNotifClick(notif)}
                              className={clsx(
                                "flex items-start gap-3 p-3 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer border-b border-[var(--border-default)] last:border-0",
                                !notif.read ? "bg-[var(--accent-soft)]/20" : ""
                              )}
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-[var(--border-default)]">
                                <img src={notif.fromUserAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${notif.fromUserName}`} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[var(--text-primary)] leading-snug">
                                  {notif.message}
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">
                                  {formatDistanceToNow(getDate(notif.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0 mt-1"></div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-4 w-px bg-[var(--border-default)] hidden md:block" />

                {/* GC Display */}
                <div className="hidden md:flex items-center gap-1.5 px-2">
                  <span className="text-sm">🌿</span>
                  <span className="text-sm font-semibold text-[var(--accent)]">{userProfile?.greenCredits || 0}</span>
                </div>

                {/* Avatar / Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)} 
                    className="w-8 h-8 rounded-full ring-2 ring-[var(--bg-surface)] hover:ring-[var(--border-default)] transition-[var(--transition)] overflow-hidden bg-[var(--bg-subtle)]"
                  >
                    <img src={getAvatar()} alt="Profile" className="w-full h-full object-cover" />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute top-10 right-0 mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-3 mb-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{userProfile?.displayName || user.displayName || 'Eco Warrior'}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                      </div>
                      <div className="h-px bg-[var(--border-default)] my-1" />
                      
                      <div className="md:hidden p-1">
                        <Link href="/leaderboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] rounded-[var(--radius-md)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)] w-full">
                          <Trophy className="w-4 h-4" /> Leaderboard
                        </Link>
                        <Link href="/badges" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] rounded-[var(--radius-md)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)] w-full">
                          <Shield className="w-4 h-4" /> Badges
                        </Link>
                        <div className="h-px bg-[var(--border-default)] my-1 mx-2" />
                      </div>

                      <div className="hidden md:block p-1">
                        <a href={`/profile/${user?.uid}`} onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] rounded-[var(--radius-md)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)] w-full">
                          <User className="w-4 h-4" /> Profile
                        </a>
                        <Link href="/badges" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] rounded-[var(--radius-md)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)] w-full">
                          <Shield className="w-4 h-4" /> Badges
                        </Link>
                        <div className="h-px bg-[var(--border-default)] my-1 mx-2" />
                      </div>

                      <div className="p-1">
                        <button 
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--error)] rounded-[var(--radius-md)] hover:bg-red-50 w-full transition-[var(--transition)] text-left"
                        >
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link href="/login" className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] transition-[var(--transition)]">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="page-wrapper">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex justify-between px-2 pb-[safe-area-inset-bottom] z-40">
          {mobileNav.map((item) => {
            const isActive = pathname.startsWith(item.href) || (item.href === '/profile' && pathname === `/profile/${user.uid}`);
            const Icon = item.icon;
            return item.href === '/profile' ? (
              <a 
                key={item.name} 
                href={`/profile/${user.uid}`}
                className={clsx(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative",
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 w-8 h-0.5 bg-[var(--accent)] rounded-b-full"></div>
                )}
                <Icon className={clsx("w-5 h-5 transition-transform", isActive && "fill-current scale-110")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </a>
            ) : (
              <Link 
                key={item.name} 
                href={item.href}
                className={clsx(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative",
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 w-8 h-0.5 bg-[var(--accent)] rounded-b-full"></div>
                )}
                <Icon className={clsx("w-5 h-5 transition-transform", isActive && "fill-current scale-110")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Global Logging Action Modal */}
      {user && <LogActionModal user={user} />}
    </div>
  );
}
