import React from 'react';
import { Sparkles, Calendar, MessageSquare, PhoneCall, Gift, HeartHandshake, Lock, User, LogOut } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-saffron-100 shadow-sm">
      {/* Top sacred banner */}
      <div className="w-full bg-linear-gradient-to-r from-saffron-600 via-saffron-500 to-gold-600 text-white text-xs px-4 py-1.5 flex justify-between items-center tracking-wide font-medium">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-gold-100" />
          Blessings & Shubh Muhurat Pooja Bookings for 2026
        </span>
        <div className="hidden sm:flex items-center gap-4">
          <span className="hover:text-gold-100 transition duration-150 cursor-pointer flex items-center gap-1">
            <Gift className="w-3 h-3" /> Get Free Janampatri Analysis with Premium Bookings
          </span>
          <span className="text-white/40">|</span>
          <span className="flex items-center gap-1">
            <PhoneCall className="w-3 h-3" /> Support: {contactPhone || '+91 98851 10082'}
          </span>
          {whatsappNumber && (
            <>
              <span className="text-white/40">|</span>
              <a 
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                referrerPolicy="no-referrer"
                className="hover:text-green-300 text-green-200 transition duration-150 cursor-pointer flex items-center gap-1 font-bold"
              >
                <span className="text-xs">💬 Connect WhatsApp</span>
              </a>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          
          {/* Logo Brand */}
          <div 
            onClick={() => setActiveTab('pujas')} 
            className="flex items-center gap-3 cursor-pointer group"
            id="brand-logo"
          >
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-linear-to-tr from-saffron-500 to-gold-500 flex items-center justify-center shadow-md holy-glow-effect">
              <span className="text-xl sm:text-2xl font-bold text-white font-display">ॐ</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-saffron-700 tracking-tight font-display flex items-baseline leading-none">
                Pooja<span className="text-gold-500 font-sans text-sm sm:text-lg font-semibold ml-0.5">4</span>Panditji
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 font-mono tracking-wider font-semibold">AUTHENTIC VEDIC RITUALS</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-1 sm:gap-4">
            
            {/* Puja Directory Link */}
            <button
              id="nav-pujas-btn"
              onClick={() => setActiveTab('pujas')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'pujas'
                  ? 'bg-saffron-50 text-saffron-700 border-b-2 border-saffron-500'
                  : 'text-gray-600 hover:text-saffron-600 hover:bg-saffron-50/50'
              }`}
            >
              <HeartHandshake className="w-4 h-4 hidden xs:block text-saffron-500" />
              <span>Explore Pujas</span>
            </button>

            {/* Pandit Ji Chatbot Link */}
            <button
              id="nav-chat-btn"
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'chat'
                  ? 'bg-saffron-50 text-saffron-700 border-b-2 border-saffron-500 font-semibold'
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
            <button
              id="nav-bookings-btn"
              onClick={() => setActiveTab('bookings')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 relative ${
                activeTab === 'bookings'
                  ? 'bg-saffron-50 text-saffron-700 border-b-2 border-saffron-500'
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

            {/* Admin Link */}
            <button
              id="nav-admin-btn"
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 relative ${
                activeTab === 'admin'
                  ? 'bg-saffron-50 text-saffron-700 border-b-2 border-saffron-500 font-semibold'
                  : 'text-gray-600 hover:text-saffron-600 hover:bg-saffron-50/50'
              }`}
            >
              <Lock className="w-4 h-4 text-saffron-500" />
              <span>Admin Portal</span>
            </button>

            {/* Devotee Profile/Login Status */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-150" id="nav-user-badge">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-saffron-50 border border-saffron-100 text-saffron-800 text-xs font-bold leading-none select-none" title={`Auspiciously Logged in as ${currentUser.fullName}`}>
                  <div className="w-5 h-5 rounded-full bg-saffron-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                  </div>
                  <span className="hidden md:inline overflow-hidden text-ellipsis max-w-[80px] whitespace-nowrap">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                </div>
                
                <button
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
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
        </div>
      </div>
    </header>
  );
}
