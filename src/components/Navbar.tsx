import React, { useState } from 'react';
import { Sparkles, Calendar, MessageSquare, PhoneCall, Gift, HeartHandshake, Lock, User, LogOut, Menu, X } from 'lucide-react';
import { UserAccount } from '../types';

interface NavbarProps {
  activeTab: 'pujas' | 'chat' | 'bookings' | 'admin';
  setActiveTab: (tab: 'pujas' | 'chat' | 'bookings' | 'admin') => void;
  bookingCount: number;
  contactPhone?: string;
  whatsappNumber?: string;
  currentUser: UserAccount | null;
  onLogout: () => void;
  onOpenLoginModal: () => void;
}

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  bookingCount, 
  contactPhone, 
  whatsappNumber,
  currentUser,
  onLogout,
  onOpenLoginModal 
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: 'pujas' | 'chat' | 'bookings' | 'admin') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-45 w-full bg-white/95 backdrop-blur-md border-b border-saffron-100 shadow-sm">
      {/* Top sacred banner */}
      <div className="w-full bg-linear-to-r from-saffron-600 via-saffron-500 to-amber-600 text-white text-[10px] sm:text-xs px-3 py-2 sm:py-1.5 flex flex-col md:flex-row justify-between items-center gap-1.5 border-b border-saffron-500/30">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="flex items-center gap-1.5 font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-gold-100 shrink-0" />
            <span>Blessings & Shubh Muhurat Pooja Bookings for 2026</span>
          </span>
          <span className="hidden lg:inline text-white/35">|</span>
          <span className="bg-amber-500 text-amber-950 font-bold px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] uppercase shadow-xs inline-flex items-center gap-1">
            <Gift className="w-2.5 h-2.5 text-amber-950" />
            <span>Free Horoscope Matching with Premium Packages!</span>
          </span>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 font-semibold text-[10px] sm:text-xs text-white/95">
          <span className="flex items-center gap-1">
            <PhoneCall className="w-3 h-3 text-saffron-200" /> 
            <span>Call: {contactPhone || '+91 98851 10082'}</span>
          </span>
          {whatsappNumber && (
            <>
              <span className="text-white/30">|</span>
              <a 
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                referrerPolicy="no-referrer"
                className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-0.5 rounded shadow-xs transition duration-150 text-[10px]"
              >
                <span>💬 WhatsApp Pandit</span>
              </a>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          
          {/* Logo Brand */}
          <div 
            onClick={() => handleTabClick('pujas')} 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            id="brand-logo"
          >
            <div className="w-9 sm:w-12 h-9 sm:h-12 rounded-full bg-linear-to-tr from-saffron-500 to-gold-500 flex items-center justify-center shadow-md holy-glow-effect">
              <span className="text-lg sm:text-2xl font-bold text-white font-display">ॐ</span>
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-extrabold text-saffron-700 tracking-tight font-display flex items-baseline leading-none">
                Pooja<span className="text-gold-500 font-sans text-xs sm:text-lg font-semibold ml-0.5">4</span>Panditji
              </h1>
              <p className="text-[8px] sm:text-xs text-gray-400 font-mono tracking-wider font-semibold">AUTHENTIC VEDIC RITUALS</p>
            </div>
          </div>

          {/* Desktop Nav Links (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4">
            
            {/* Puja Directory Link */}
            <button
              id="nav-pujas-btn"
              onClick={() => handleTabClick('pujas')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'pujas'
                  ? 'bg-saffron-50 text-saffron-700 border-b-2 border-saffron-500 font-bold'
                  : 'text-gray-600 hover:text-saffron-600 hover:bg-saffron-50/50'
              }`}
            >
              <HeartHandshake className="w-4 h-4 text-saffron-500" />
              <span>Explore Pujas</span>
            </button>

            {/* Pandit Ji Chatbot Link */}
            <button
              id="nav-chat-btn"
              onClick={() => handleTabClick('chat')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-saffron-50 text-saffron-700 border-b-2 border-saffron-500 font-bold'
                  : 'text-gray-600 hover:text-saffron-600 hover:bg-saffron-50/50'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron-500"></span>
              </span>
              <MessageSquare className="w-4 h-4 text-saffron-500" />
              <span>AI Pandit Ji</span>
            </button>

            {/* Bookings Link */}
            {currentUser && (
              <button
                id="nav-bookings-btn"
                onClick={() => handleTabClick('bookings')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 relative cursor-pointer ${
                  activeTab === 'bookings'
                    ? 'bg-saffron-50 text-saffron-700 border-b-2 border-saffron-500 font-bold'
                    : 'text-gray-600 hover:text-saffron-600 hover:bg-saffron-50/50'
                }`}
              >
                <Calendar className="w-4 h-4 text-saffron-500" />
                <span>My Bookings</span>
                {bookingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-saffron-600 text-white font-mono text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-bounce shadow-md">
                    {bookingCount}
                  </span>
                )}
              </button>
            )}

            {/* Admin Link */}
            {(currentUser?.isAdmin || currentUser?.email === 'vsvikash290@gmail.com' || currentUser?.email === 'vikas.savita@smollan.com') && (
              <button
                id="nav-admin-btn"
                onClick={() => handleTabClick('admin')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 relative cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-saffron-50 text-saffron-700 border-b-2 border-saffron-500 font-bold'
                    : 'text-gray-600 hover:text-saffron-600 hover:bg-saffron-50/50'
                }`}
              >
                <Lock className="w-4 h-4 text-saffron-500" />
                <span>Admin Portal</span>
              </button>
            )}

            {/* Devotee Profile/Login Status */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-150 animate-fadeIn" id="nav-user-badge">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-saffron-50 border border-saffron-100 text-saffron-800 text-xs font-bold leading-none select-none" title={`Auspiciously Logged in as ${currentUser.fullName}`}>
                  <div className="w-5 h-5 rounded-full bg-saffron-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                  </div>
                  <span className="overflow-hidden text-ellipsis max-w-[80px] whitespace-nowrap">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                </div>
                
                <button
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Sign Out of Devotion Portal"
                  id="nav-user-logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-3.5 py-1.5 bg-linear-to-r from-saffron-600 to-amber-500 hover:from-saffron-700 hover:to-amber-600 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer focus:outline-none"
                id="nav-login-trigger-btn"
              >
                <User className="w-3.5 h-3.5 text-white" />
                <span>Sign In</span>
              </button>
            )}

          </nav>

          {/* Mobile hamburger menu button */}
          <div className="flex md:hidden items-center gap-2">
            {bookingCount > 0 && activeTab !== 'bookings' && (
              <span 
                onClick={() => handleTabClick('bookings')}
                className="bg-saffron-600 text-white font-mono text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse cursor-pointer shrink-0"
              >
                {bookingCount}
              </span>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-saffron-700 bg-saffron-50 hover:bg-saffron-100/80 rounded-lg focus:outline-none transition shrink-0 cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-saffron-100 bg-white/98 backdrop-blur-md shadow-lg animate-fadeIn">
          <div className="px-4 py-3 space-y-1.5">
            {/* Explore Pujas Tab */}
            <button
              onClick={() => handleTabClick('pujas')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === 'pujas'
                  ? 'bg-saffron-500 text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Explore Pujas</span>
            </button>

            {/* AI Pandit Chat Tab */}
            <button
              onClick={() => handleTabClick('chat')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === 'chat'
                  ? 'bg-saffron-505 bg-saffron-500 text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron-500"></span>
              </div>
              <MessageSquare className="w-4 h-4" />
              <span>AI Pandit Ji</span>
            </button>

            {/* My Bookings Tab */}
            {currentUser && (
              <button
                onClick={() => handleTabClick('bookings')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
                  activeTab === 'bookings'
                    ? 'bg-saffron-500 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Calendar className="w-4 h-4" />
                  <span>My Bookings</span>
                </span>
                {bookingCount > 0 && (
                  <span className="bg-red-500 text-white font-mono text-[9px] px-2 py-0.5 rounded-full font-bold">
                    {bookingCount} New
                  </span>
                )}
              </button>
            )}

            {/* Admin Portal Tab */}
            {(currentUser?.isAdmin || currentUser?.email === 'vsvikash290@gmail.com' || currentUser?.email === 'vikas.savita@smollan.com') && (
              <button
                onClick={() => handleTabClick('admin')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-saffron-500 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-4 h-4 animate-pulse text-amber-500" />
                <span>Admin Portal</span>
              </button>
            )}

            {/* User authentication block for mobile */}
            <div className="border-t border-gray-100 pt-2.5 mt-2">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="px-4 py-2 bg-saffron-50 rounded-xl flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-saffron-600 text-white flex items-center justify-center text-xs font-bold leading-none select-none">
                      {currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 font-mono">Devotee logged in</p>
                      <p className="text-xs font-bold text-saffron-900">{currentUser.fullName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out Device</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onOpenLoginModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-linear-to-r from-saffron-600 to-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>Devotee Sign In / Sign Up</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
