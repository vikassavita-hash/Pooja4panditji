import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import PujaCard from './components/PujaCard';
import { PUJAS_DATA } from './data/pujas';
import { Puja, Booking, ChatMessage, PujaPackage, PortalSettings, UserAccount } from './types';
import AdminPortal from './components/AdminPortal';
import { getSettings, saveSettings, getPujas, savePujas, getUsers, saveUsers, getBookings, saveBookings } from './backend';
import { 
  Sparkles, ShieldCheck, CreditCard, Clock, MapPin, Globe, CheckCircle2, 
  Calendar, Check, User, Phone, Mail, Award, ArrowRight, MessageSquare, 
  AlertTriangle, Play, HelpCircle, FileText, Smartphone, ExternalLink,
  ChevronRight, Lock, RefreshCw, Volume2, Info, CheckSquare
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pujas' | 'chat' | 'bookings' | 'admin'>('pujas');
  const [pujas, setPujas] = useState<Puja[]>(() => {
    const saved = localStorage.getItem('pooja4panditji_pujas_catalog');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse local storage pujas catalog.");
      }
    }
    return PUJAS_DATA;
  });

  useEffect(() => {
    localStorage.setItem('pooja4panditji_pujas_catalog', JSON.stringify(pujas));
    savePujas(pujas).catch(err => console.error("Could not sync pujas to backend:", err));
  }, [pujas]);

  const [settings, setSettings] = useState<PortalSettings>(() => {
    const saved = localStorage.getItem('pooja4panditji_settings');
    const defaults = {
      contactPhone: '+91 84450 30767',
      whatsappNumber: '+91 84450 30767',
      contactEmail: 'vsvikash290@gmail.com',
      geminiApiKey: '',
      upiId: 'shastri.pandit108@okhdfcbank',
      upiQrUrl: '',
      panditName: 'Shyam Guru ji',
      panditCertification: 'Certified by Mathura Vedic Board',
      panditBio: 'Renowned scholar of Astro-Vedic rituals and Yajnas, directly descended from traditional priestly line of Mathura. Specialist in dynamic Kundali matchmaking and Shubh Muhurat determinations.',
      showExplorePujasTab: true,
      showAiPanditTab: true,
      showMyBookingsTab: true,
      showAdminPortalTab: true,
      devoteeTerms: '1. All devotion services (Shradha Dakshina) are verified secure.\n2. The simulated handshakes are for instructional, direct, offline and virtual connect.\n3. By booking any puja, the devotee agrees to provide accurate Birth coordinates, Gothra and Nakshatra.\n4. Standard 24 Hours validity applies to digital chatbot and voice consult channels.\n5. Vedic rituals represent deep lineage devotion.'
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      } catch (err) {
        console.error("Failed to parse local storage settings.", err);
      }
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem('pooja4panditji_settings', JSON.stringify(settings));
    saveSettings(settings).catch(err => console.error("Could not sync settings to backend:", err));
  }, [settings]);

  // Devotee state structures
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('pooja4panditji_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse local storage users.", err);
      }
    }
    return [
      {
        userId: 'vikas.savita@smollan.com',
        passwordHash: 'password123',
        fullName: 'Vikas Savita',
        phone: '+91 98765 43210',
        email: 'vikas.savita@smollan.com',
        gothra: 'Bhardwaj',
        nakshatra: 'Rohini',
        createdAt: '2026-05-18T10:00:00Z'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('pooja4panditji_users', JSON.stringify(users));
    saveUsers(users).catch(err => console.error("Could not sync users to backend:", err));
  }, [users]);

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('pooja4panditji_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse current user.", err);
      }
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pooja4panditji_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pooja4panditji_current_user');
    }
  }, [currentUser]);

  // Initial Fetch synchronizer on Mount to pull latest persistent backend data
  useEffect(() => {
    async function syncBackendData() {
      try {
        const settingsData = await getSettings();
        if (settingsData && (settingsData as any).contactPhone) {
          setSettings(settingsData as PortalSettings);
        }

        const pujasList = await getPujas();
        if (Array.isArray(pujasList) && pujasList.length > 0) {
          setPujas(pujasList as Puja[]);
        }

        const usersList = await getUsers();
        if (Array.isArray(usersList) && usersList.length > 0) {
          setUsers(usersList as UserAccount[]);
        }

        const bookingsList = await getBookings();
        if (Array.isArray(bookingsList)) {
          setBookings(bookingsList as Booking[]);
        }
      } catch (error) {
        console.error("Initial backend synchronization pause (server offline or compiling):", error);
      }
    }
    syncBackendData();
  }, []);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginTab, setLoginTab] = useState<'signin' | 'signup'>('signin');

  const [hasDirectPanditAccess, setHasDirectPanditAccess] = useState<boolean>(false);
  const [directPanditExpiry, setDirectPanditExpiry] = useState<number | null>(null);
  const [previouslyPaidPandit, setPreviouslyPaidPandit] = useState<boolean>(false);

  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [consultFormName, setConsultFormName] = useState('');
  const [consultFormPhone, setConsultFormPhone] = useState('');
  const [consultFormGothra, setConsultFormGothra] = useState('');
  const [consultFormNotes, setConsultFormNotes] = useState('');
  const [consultPayMethod, setConsultPayMethod] = useState<'upi' | 'card'>('upi');

  // Helper to re-evaluate the active status and expiry
  const updateAccessFromStorage = () => {
    if (!currentUser) {
      setHasDirectPanditAccess(false);
      setDirectPanditExpiry(null);
      setPreviouslyPaidPandit(false);
      return;
    }
    const expiryKey = `pooja4panditji_expiry_${currentUser.email}`;
    const paidKey = `pooja4panditji_previously_paid_${currentUser.email}`;
    
    const savedExpiry = localStorage.getItem(expiryKey);
    const hasPaidBefore = localStorage.getItem(paidKey) === 'true';
    
    setPreviouslyPaidPandit(hasPaidBefore);

    if (savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10);
      if (expiryTime > Date.now()) {
        setHasDirectPanditAccess(true);
        setDirectPanditExpiry(expiryTime);
      } else {
        setHasDirectPanditAccess(false);
        setDirectPanditExpiry(expiryTime);
      }
    } else {
      setHasDirectPanditAccess(false);
      setDirectPanditExpiry(null);
    }
  };

  useEffect(() => {
    updateAccessFromStorage();
  }, [currentUser]);

  // Periodic check (every 10 seconds) to auto-expire
  useEffect(() => {
    const timer = setInterval(() => {
      updateAccessFromStorage();
    }, 10000);
    return () => clearInterval(timer);
  }, [currentUser]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // Bookings list state with a high-fidelity preloaded sample for immediate visual polish
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('pooja4panditji_bookings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse local storage bookings.");
      }
    }
    // Return a default beautiful sample booking if none exist
    return [
      {
        id: 'BKG-9843-VEDA',
        pujaId: 'satyanarayan',
        pujaName: 'Sri Satyanarayan Puja',
        pujaImage: 'https://images.unsplash.com/photo-1609137144814-6330bf4cb51b?auto=format&fit=crop&q=80&w=600',
        customerName: 'Vikas Savita',
        customerPhone: '+91 98765 43210',
        customerEmail: 'vikas.savita@smollan.com',
        gothra: 'Bhardwaj',
        nakshatra: 'Rohini',
        sankalpNames: 'Vikas Savita & Family',
        mode: 'e-puja',
        dateTime: '2026-06-15T09:30',
        language: 'Sanskrit & Hindi',
        packageId: 'basic',
        packageName: 'Katha & Sankalp (E-Puja)',
        price: 2100,
        includeSamagriKit: false,
        status: 'confirmed',
        paymentId: 'PAY-STN-89473-OK',
        paymentMethod: 'UPI (GPay)',
        meetingLink: 'https://meet.google.com/ais-veda-satya',
        transactionDateTime: '2026-05-22T12:00:00Z',
        otpVerified: true,
        notes: 'Please pray for my mother\'s speedy recovery.'
      }
    ];
  });

  // Save bookings to localStorage
  useEffect(() => {
    localStorage.setItem('pooja4panditji_bookings', JSON.stringify(bookings));
    saveBookings(bookings).catch(err => console.error("Could not sync bookings to backend:", err));
  }, [bookings]);

  // Booking process states
  const [selectedPuja, setSelectedPuja] = useState<Puja | null>(null);
  const [bookingStep, setBookingStep] = useState<'package' | 'form' | 'payment' | 'otp' | 'success'>('package');
  const [selectedPackage, setSelectedPackage] = useState<PujaPackage | null>(null);
  
  // Booking Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [gothra, setGothra] = useState('');
  const [nakshatra, setNakshatra] = useState('');
  const [sankalpNames, setSankalpNames] = useState('');
  const [pujaMode, setPujaMode] = useState<'in-person-home' | 'in-person-temple' | 'e-puja'>('in-person-home');
  const [dateTime, setDateTime] = useState('');
  const [language, setLanguage] = useState('Hindi & Sanskrit');
  const [includeSamagriKit, setIncludeSamagriKit] = useState(true);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Payment State details
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('sbi');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Pre-fill booking form based on authenticated user info
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.fullName);
      setCustomerPhone(currentUser.phone);
      setCustomerEmail(currentUser.email);
      setGothra(currentUser.gothra || '');
      setNakshatra(currentUser.nakshatra || '');
      setSankalpNames(currentUser.fullName + ' & Family');
    }
  }, [currentUser, selectedPuja]);
  const [sentOtpCode, setSentOtpCode] = useState('1008'); // Highly sacred OTP default 
  const [userOtp, setUserOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [lastCreatedBooking, setLastCreatedBooking] = useState<Booking | null>(null);
  
  // Interactive live virtual altar state (modal)
  const [activeEpujaLive, setActiveEpujaLive] = useState<Booking | null>(null);
  const [isBellRinging, setIsBellRinging] = useState(false);
  const [bellCount, setBellCount] = useState(0);
  const [chantsShown, setChantsShown] = useState<string[]>([
    "ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात् ॥",
    "ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय माऽमृतात् ॥",
    "शान्ताकारं भुजगशयनं पद्मनाभं सुरेशं विश्वाधारं गगनसदृशं मेघवर्णं शुभाङ्गम् ॥",
    "कर्पूरगौरं करुणावतारं संसारसारम् भुजगेन्द्रहारम् सदावसन्तं हृदयारविन्दे भवं भवानीसहितं नमामि ॥"
  ]);
  const [activeChantIndex, setActiveChantIndex] = useState(0);

  // Chat window states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    // Initial load: check if a user is pre-selected
    const initialUser = localStorage.getItem('pooja4panditji_current_user');
    let email = 'guest';
    if (initialUser) {
      try {
        const u = JSON.parse(initialUser);
        if (u && u.email) email = u.email;
      } catch (_) {}
    }
    const key = `pooja4panditji_chat_${email}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch(_) {}
    }
    return [
      {
        id: 'welcome-msg',
        sender: 'pandit',
        text: 'Pranam, dear devotee! 🙏 Welcome to Pooja4Panditji. I am pleased to offer spiritual counsel, explain the inner benefits of cosmic Havans, or help you identify the right ritual for your family’s happiness, safety, prosperity, and spiritual health. Which aspect of your life might I bless or guide today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  
  const [userChatInput, setUserChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedChatLanguage, setSelectedChatLanguage] = useState<string>('multilingual');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dynamically load user-specific or guest-specific chat history when login status changes
  useEffect(() => {
    const email = currentUser ? currentUser.email : 'guest';
    const key = `pooja4panditji_chat_${email}`;
    const saved = localStorage.getItem(key);
    const customWelcome = `Pranam, dear devotee! 🙏 I am ${settings.panditName || 'Shyam Guru ji'}, ${settings.panditCertification || 'certified by Mathura'}. Welcome to Pooja4Panditji Devotee Portal. I am pleased to offer spiritual counsel in multiple languages, explain the inner benefits of cosmic Havans, or help you identify the right ritual for your family’s happiness, safety, prosperity, and spiritual health. Which aspect of your life might I bless or guide today?`;

    if (saved) {
      try {
        setChatMessages(JSON.parse(saved));
      } catch (_) {
        setChatMessages([
          {
            id: 'welcome-msg',
            sender: 'pandit',
            text: customWelcome,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } else {
      setChatMessages([
        {
          id: 'welcome-msg',
          sender: 'pandit',
          text: customWelcome,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [currentUser, settings.panditName, settings.panditCertification]);

  // Save chat to the correct user-specific template key in localStorage
  useEffect(() => {
    const email = currentUser ? currentUser.email : 'guest';
    const key = `pooja4panditji_chat_${email}`;
    localStorage.setItem(key, JSON.stringify(chatMessages));
  }, [chatMessages, currentUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Countdown timer for simulated live payment QR
  const [qrCountdown, setQrCountdown] = useState(300); // 5 minutes
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (bookingStep === 'payment' && paymentMethod === 'upi') {
      timer = setInterval(() => {
        setQrCountdown(prev => (prev > 0 ? prev - 1 : 300));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [bookingStep, paymentMethod]);

  const handleBookingStart = (puja: Puja) => {
    setSelectedPuja(puja);
    // Auto-select standard or basic package initially
    const std = puja.packages.find(p => p.id === 'standard') || puja.packages[0];
    setSelectedPackage(std);
    setBookingStep('package');
    setPujaMode(std.id === 'basic' ? 'e-puja' : 'in-person-home');
    setIncludeSamagriKit(std.includedSamagri);
    
    // Clear previous form fields except names if user wants
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setGothra('');
    setNakshatra('');
    setSankalpNames('');
    setDateTime('');
    setAddress('');
    setNotes('');
  };

  const handlePackageSelect = (pkg: PujaPackage) => {
    setSelectedPackage(pkg);
    setIncludeSamagriKit(pkg.includedSamagri);
    if (pkg.id === 'basic') {
      setPujaMode('e-puja');
    } else {
      setPujaMode('in-person-home');
    }
  };

  const handlePersonalFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerEmail || !dateTime) {
      alert("Please provide complete name, phone, email, and the chosen date & time of the ritual.");
      return;
    }
    if (pujaMode === 'in-person-home' && !address) {
      alert("Please enter the home address where Pandit Ji will perform the Puja.");
      return;
    }
    setBookingStep('payment');
    // Seed default payment parameters
    setQrCountdown(300);
    setUserOtp('');
    setOtpError('');
  };

  const calculateTotalPrice = () => {
    if (!selectedPackage) return 0;
    let base = selectedPackage.price;
    // Add custom samagri kit charge if not built-in but selected anyway, or vice versa
    if (includeSamagriKit && !selectedPackage.includedSamagri) {
      base += 1250; // Premium material collection cost
    }
    return base;
  };

  const handlePaymentInitiate = () => {
    setPaymentProcessing(true);
    
    // Simulate transaction security handshake
    setTimeout(() => {
      setPaymentProcessing(false);
      // Send interactive OTP
      setBookingStep('otp');
      // Set OTP to highly devotional/auspicious numbers
      const sacredOTPs = ['1008', '108', '777', '511'];
      const randomSeed = sacredOTPs[Math.floor(Math.random() * sacredOTPs.length)];
      setSentOtpCode(randomSeed);
    }, 1500);
  };

  const handleOtpVerify = () => {
    if (userOtp !== sentOtpCode) {
      setOtpError(`The verification OTP code does not match. (Tip: Enter the secret OTP code: "${sentOtpCode}")`);
      return;
    }

    setPaymentProcessing(true);
    setOtpError('');

    setTimeout(() => {
      setPaymentProcessing(false);
      
      const pricePaid = calculateTotalPrice();
      const newBookingId = `BKG-${Math.floor(1000 + Math.random() * 9000)}-VEDA`;
      
      const newBooking: Booking = {
        id: newBookingId,
        pujaId: selectedPuja!.id,
        pujaName: selectedPuja!.name,
        pujaImage: selectedPuja!.imageUrl,
        customerName,
        customerPhone,
        customerEmail,
        gothra: gothra || "Kashyap (Universal/No Gothra)",
        nakshatra: nakshatra || "Anuradha",
        sankalpNames: sankalpNames || customerName,
        mode: pujaMode,
        dateTime,
        language,
        packageId: selectedPackage!.id,
        packageName: selectedPackage!.name,
        price: pricePaid,
        address: pujaMode === 'in-person-home' ? address : undefined,
        includeSamagriKit,
        notes,
        status: 'confirmed',
        paymentId: `PAY-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        paymentMethod: paymentMethod === 'upi' ? `UPI App` : paymentMethod === 'card' ? 'Secure Visa/MasterCard' : 'NetBanking Secure',
        meetingLink: pujaMode === 'e-puja' ? `https://meet.google.com/ais-veda-${selectedPuja!.id}` : undefined,
        transactionDateTime: new Date().toISOString(),
        otpVerified: true
      };

      setBookings(prev => [newBooking, ...prev]);
      setLastCreatedBooking(newBooking);
      setBookingStep('success');
    }, 1200);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Chat message submission API call
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userChatInput.trim() || chatLoading) return;

    const userText = userChatInput;
    setUserChatInput('');

    // Prepend user message locally
    const userMsg: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: updatedMessages,
          customApiKey: settings.geminiApiKey,
          language: selectedChatLanguage,
          panditName: settings.panditName,
          panditCertification: settings.panditCertification,
          panditBio: settings.panditBio
        }),
      });

      const data = await response.json();
      
      const panditMsg: ChatMessage = {
        id: `pandit-msg-${Date.now()}`,
        sender: 'pandit',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages(prev => [...prev, panditMsg]);
    } catch (err) {
      console.error("Failed to send chat message server-side:", err);
      // Append fallback graceful text locally
      const errorMsg: ChatMessage = {
        id: `pandit-fail-${Date.now()}`,
        sender: 'pandit',
        text: 'Pranam. A slight disturbance in the cosmic ether. Check your network or make sure you added the GEMINI_API_KEY in secrets. May you be blessed with longevity and peace.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultFormName.trim() || !consultFormPhone.trim()) {
      alert("Please fill your host name and mobile coordinates first.");
      return;
    }
    
    // Calculate price based on whether they had previous access
    const isRenewal = previouslyPaidPandit;
    const finalPrice = isRenewal ? 125 : 251;
    
    // Simulate premium unlock process
    const transactionId = `PAY-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const newBooking: Booking = {
      id: `CNS-${Math.floor(10000 + Math.random() * 90000)}`,
      pujaId: 'live-consult',
      pujaName: 'Live Phone & 1-on-1 Pandit Chat',
      pujaImage: 'https://images.unsplash.com/photo-1609137144690-3f71c4c9540b?auto=format&fit=crop&q=80&w=200',
      customerName: consultFormName,
      customerPhone: consultFormPhone,
      customerEmail: currentUser?.email || 'devotee@pooja4panditji.com',
      gothra: consultFormGothra || "Kashyap (Universal/No Gothra)",
      nakshatra: "Universal",
      sankalpNames: consultFormName,
      mode: 'e-puja',
      dateTime: new Date().toISOString(),
      language: 'Hindi & Sanskrit',
      packageId: 'standard',
      packageName: isRenewal ? 'Premium Live Astral Guidance (50% Renewal)' : 'Premium Live Astral Guidance',
      price: finalPrice,
      includeSamagriKit: false,
      notes: consultFormNotes || "Direct Astrological chat query & sacred mobile call helpline request.",
      status: 'confirmed',
      paymentId: transactionId,
      paymentMethod: consultPayMethod === 'upi' ? 'UPI Secure Transfer' : 'Verified Secure Card Gateway',
      meetingLink: 'https://meet.google.com/ais-live-consult',
      transactionDateTime: new Date().toISOString(),
      otpVerified: true
    };

    setBookings(prev => [newBooking, ...prev]);
    
    const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
    const email = currentUser?.email || 'guest';
    const expiryKey = `pooja4panditji_expiry_${email}`;
    const paidKey = `pooja4panditji_previously_paid_${email}`;
    
    localStorage.setItem(expiryKey, expiryTime.toString());
    localStorage.setItem(paidKey, 'true');
    localStorage.setItem('pooja4panditji_has_direct_pandit', 'true');
    
    setIsConsultModalOpen(false);

    // Recalculate and update the active state
    setTimeout(() => {
      updateAccessFromStorage();
    }, 10);

    // Add immediate success message in chat feed
    const upgradedMessage: ChatMessage = {
      id: `pandit-upgrade-${Date.now()}`,
      sender: 'pandit',
      text: `🕉️ *Om Shanti! Deep pranams, dear host ${consultFormName}.* 🕉️\n\nYour Shradha Dakshina of *₹${finalPrice}* ${isRenewal ? '(with 50% Renewal Discount applied!)' : ''} has been certified securely (Txn: ${transactionId}).\n\nYou have successfully unlocked **24 Hours Unlimited Direct Chat & Call Hotline** with me.\n\nI will personally call you on your certified phone (${consultFormPhone}) or reach out on WhatsApp within the next **15 minutes** to guide you regarding Shubh Muhurats, customized planetary charts, and your family's dynamic Nakshatra aspects.\n\nYour premium access is valid until **${new Date(expiryTime).toLocaleString()}** (24 Hours from now).\n\nHow can I serve your metaphysical journey right now? Please state your questions freely.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, upgradedMessage]);
  };

  const triggerChatPill = (text: string) => {
    setUserChatInput(text);
    // Focus chat input if possible
    setTimeout(() => {
      document.getElementById('chat-input-box')?.focus();
    }, 50);
  };

  const ringTempleBell = () => {
    setIsBellRinging(true);
    setBellCount(prev => prev + 1);
    
    // Play optional synthesized audio tone for authentic bell sound (safely catches standard browser policy blocks)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime); // high pure temple bell pitch
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.8);
      
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    } catch(e) {
      // Audio context failed/blocked by policy, ignore safely
    }

    setTimeout(() => {
      setIsBellRinging(false);
    }, 450);
  };

  // Cycling the main visual sanskrit slokas on-screen for virtual temple
  const nextSloka = () => {
    setActiveChantIndex(prev => (prev + 1) % chantsShown.length);
  };

  const filteredPujas = activeCategory === 'all' 
    ? pujas 
    : pujas.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-saffron-50/20 text-gray-800 flex flex-col font-sans">
      
      {/* Visual Navigation Bar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Close active booking modal if shifting focus
          setSelectedPuja(null);
        }} 
        bookingCount={currentUser ? bookings.filter(b => b.customerEmail.toLowerCase() === currentUser.email.toLowerCase()).length : 0} 
        contactPhone={settings.contactPhone}
        whatsappNumber={settings.whatsappNumber}
        currentUser={currentUser}
        onLogout={() => {
          setCurrentUser(null);
          setActiveTab('pujas');
          // reset form triggers if logged out
          setCustomerName('');
          setCustomerPhone('');
          setCustomerEmail('');
          setGothra('');
          setNakshatra('');
          setSankalpNames('');
        }}
        onOpenLoginModal={() => {
          setLoginTab('signin');
          setIsLoginModalOpen(true);
        }}
      />

      {/* Main Content Areas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-12">
        
        {/* TAB 1: EXPLORE PUJAS DIRECTORY */}
        {activeTab === 'pujas' && (
          <div className="space-y-8 animate-fadeIn" id="puja-explorer-view">
            
            {/* Cinematic Saffron Spiritual Hero banner */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-saffron-700 via-saffron-600 to-amber-700 text-white p-6 sm:p-12 shadow-xl holy-glow-effect">
              {/* Spiritual vector mandala trace (CSS design overlay) */}
              <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center justify-center p-6 select-none">
                <span className="text-[180px] sm:text-[340px] font-bold font-display rotate-12">ॐ</span>
              </div>

              <div className="relative max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-gold-100 text-xs font-semibold tracking-wider uppercase border border-white/10 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-gold-200 animate-pulse" />
                  India's Premier Authentic Pandit Network
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold font-display leading-tight text-white tracking-tight">
                  Perform Pure Vedic <br />
                  <span className="text-gold-200">Pujas & Anushthans</span>
                </h2>
                <p className="text-sm sm:text-base text-saffron-50 font-normal leading-relaxed">
                  Book certified Sanskrit Shastri Pandits trained at Kashi Vidyapeeth for highly personalized, authentic ceremonies. Select Home Puja with premium materials shipped to you, or attend seamlessly via high-fidelity interactive live E-Puja.
                </p>
                
                {/* Visual credentials strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs font-medium text-amber-50">
                  <div className="flex items-center gap-2 bg-black/10 px-3 py-2 rounded-lg border border-white/5">
                    <ShieldCheck className="w-4.5 h-4.5 text-gold-300" />
                    <span>Kashi-Certified Shastris</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/10 px-3 py-2 rounded-lg border border-white/5">
                    <CreditCard className="w-4.5 h-4.5 text-gold-300" />
                    <span>Secure Gateway Pay</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 bg-black/10 px-3 py-2 rounded-lg border border-white/5 col-span-1">
                    <Award className="w-4.5 h-4.5 text-gold-300" />
                    <span>Pure Dakshina Protection</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-4 text-xs items-center">
                  <button 
                    onClick={() => setActiveTab('chat')} 
                    className="bg-gold-500 hover:bg-gold-600 text-saffron-950 font-bold px-5 py-2.5 rounded-xl transition duration-150 flex items-center gap-2 shadow-md hover:shadow-lg"
                    id="find-puja-hero-btn"
                  >
                    <MessageSquare className="w-4 h-4 text-saffron-900" />
                    Talk to pandit shastri dev ji
                  </button>
                  <a 
                    href="#categories-tabs" 
                    className="text-white hover:text-gold-200 underline font-semibold transition duration-150"
                  >
                    Browse Catalogs 👇
                  </a>
                </div>
              </div>
            </div>

            {/* Puja Category Filter & Tags */}
            <div className="space-y-4" id="categories-tabs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-saffron-100 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-saffron-800 font-display flex items-center gap-2">
                    <Award className="w-5 h-5 text-saffron-500" />
                    Auspicous Devotional Offerings
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Filter pujas by specific life-realms or remedies needed</p>
                </div>

                {/* Category selectors */}
                <div className="flex flex-wrap gap-1.5 font-medium">
                  {[
                    { id: 'all', title: 'All Services' },
                    { id: 'prosperity', title: 'Wealth & Prosperity' },
                    { id: 'milestones', title: 'Milestones & Vastu' },
                    { id: 'peace', title: 'Mental Peace' },
                    { id: 'remedial', title: 'Health & Protection' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer ${
                        activeCategory === cat.id
                          ? 'bg-saffron-600 text-white shadow-sm'
                          : 'bg-white hover:bg-saffron-50 text-gray-600 border border-saffron-100'
                      }`}
                      id={`filter-cat-${cat.id}`}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Puja Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPujas.map((p) => (
                  <PujaCard 
                    key={p.id} 
                    puja={p} 
                    onBook={handleBookingStart} 
                  />
                ))}
              </div>
            </div>

            {/* Explainer / FAQ Banner */}
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-600" />
                  How online E-Puja works?
                </h4>
                <p className="text-xs text-amber-800/80 mt-1.5 leading-relaxed">
                  Devotees connect live via integrated interactive video streams. Prior to the muhurat, Pandit Ji shares unique digital checklists and guides you in setting up the modular domestic space. Secure, virtual recitation guarantees standard high-vibrational energetic results!
                </p>
              </div>
              <div>
                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  Is Samagri delivered?
                </h4>
                <p className="text-xs text-amber-800/80 mt-1.5 leading-relaxed">
                  Yes! All Standard and Premium configurations contain premium high-grade Vedic samagri cargo (gangajal, camphor, kashi holy threads, herbs) dispatched 3 days prior. No runarounds or missing materials at the last minute!
                </p>
                <button 
                  onClick={() => setActiveTab('chat')} 
                  className="mt-2.5 text-xs text-saffron-700 font-bold flex items-center gap-1 hover:text-saffron-800 transition-colors cursor-pointer"
                  type="button"
                >
                  Consult Muhurat with {settings.panditName || 'Shyam Guru ji'} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: PANDIT JI AI CHATBOT */}
        {activeTab === 'chat' && (() => {
          const userMsgsCount = chatMessages.filter(msg => msg.sender === 'user').length;
          return (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-saffron-100 shadow-xl overflow-hidden flex flex-col h-[650px] animate-fadeIn" id="pandit-chatbot-view">
              
              {/* Chatbot Header */}
              <div className="p-4 bg-linear-to-r from-saffron-600 to-saffron-700 text-white flex items-center justify-between border-b border-saffron-700">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-gold-300 flex items-center justify-center text-2xl shadow-inner select-none">
                      {settings.panditImage || '👳🏽'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold font-display text-base tracking-wide text-white">{settings.panditName || 'Shyam Guru ji'}</h3>
                      <span className="bg-gold-500 text-saffron-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">Sanskrit Acharya</span>
                    </div>
                    <p className="text-xs text-saffron-100 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-300"></span>
                      Online & Meditating on Devotee Enquiries
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 text-xs text-saffron-50">
                  <div className="hidden sm:block text-right bg-white/10 px-3 py-1 bg-opacity-10 rounded-lg">
                    <p className="text-[10px] text-orange-200">{settings.panditCertification || 'Certified by Mathura'}</p>
                    <p className="font-bold font-display text-gold-100">📞 Live Audio Consults Enabled</p>
                  </div>
                </div>
              </div>

              {/* Multilingual communication bar */}
              <div className="bg-saffron-50/70 border-b border-saffron-100 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <span className="text-saffron-900 font-bold flex items-center gap-1.5 shrink-0">
                  🗣️ Communication Language:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar scroll-smooth">
                  {[
                    { code: 'multilingual', label: '🔀 Multilingual' },
                    { code: 'Hindi', label: '🇮🇳 हिंदी (Hindi)' },
                    { code: 'English', label: '🇬🇧 English' },
                    { code: 'Sanskrit', label: '🐚 संस्कृत (Sanskrit)' },
                    { code: 'Tamil', label: '🌸 தமிழ் (Tamil)' },
                    { code: 'Telugu', label: '☀️ తెలుగు (Telugu)' },
                    { code: 'Gujarati', label: '🌾 Gujarati' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSelectedChatLanguage(lang.code)}
                      className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
                        selectedChatLanguage === lang.code
                          ? 'bg-saffron-600 border-saffron-600 text-white shadow-xs'
                          : 'bg-white border-saffron-200 text-saffron-800 hover:bg-saffron-50'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Pandit call bar */}
              {!hasDirectPanditAccess ? (
                <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                  <span className="text-amber-900 font-medium flex items-center gap-2 text-center sm:text-left">
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span><strong>AI chat has 3 complimentary queries.</strong> Connect with human {settings.panditName || 'Shyam Guru ji'} directly over Voice Call & VIP WhatsApp!</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        setLoginTab('signin');
                        setIsLoginModalOpen(true);
                        alert("Please Sign In first to lock your devotee account and register dynamic consultations.");
                      } else {
                        setConsultFormName(currentUser.fullName);
                        setConsultFormPhone(currentUser.phone);
                        setConsultFormGothra(currentUser.gothra || '');
                        setIsConsultModalOpen(true);
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1 rounded-lg shadow-xs transition shrink-0 cursor-pointer text-[11px] animate-pulse"
                  >
                    {previouslyPaidPandit ? `Renew Call & VIP Chat (₹125)` : `Connect Direct Pandit (₹251)`}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border-b border-emerald-150 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-emerald-900 font-bold flex flex-wrap items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>🌟 VIP Devotee Access Active: Unlimited chats & live voice call helpline active!</span>
                    {directPanditExpiry && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {Math.max(1, Math.ceil((directPanditExpiry - Date.now()) / (1000 * 60 * 60)))} hours left (ends {new Date(directPanditExpiry).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                      </span>
                    )}
                  </span>
                  <a
                    href={`https://wa.me/${(settings.whatsappNumber || '+91 98851 10082').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="bg-emerald-650 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md shadow-xs text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition shrink-0"
                  >
                    💬 Live WhatsApp
                  </a>
                </div>
              )}

              {/* Chat Log Window */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-saffron-50/10 space-y-4 font-sans" id="chat-messages-container">
                
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}
                  >
                    <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                      
                      {/* Avatar icon */}
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm shrink-0 border border-saffron-200 shadow-xs select-none">
                        {msg.sender === 'user' ? '👤' : '👳🏽'}
                      </div>

                      {/* Chat Bubble card */}
                      <div className={`p-4 rounded-2xl shadow-xs border ${
                        msg.sender === 'user' 
                          ? 'bg-linear-to-br from-saffron-500 to-saffron-600 text-white border-saffron-600 rounded-tr-none' 
                          : 'bg-white text-gray-800 border-saffron-100 rounded-tl-none'
                      }`}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </div>
                        <span className={`block text-[10px] mt-1.5 text-right ${
                          msg.sender === 'user' ? 'text-saffron-100' : 'text-gray-400'
                        }`}>
                          {msg.timestamp}
                        </span>
                      </div>

                    </div>
                  </div>
                ))}

                {/* Chatbot typing loading animation */}
                {chatLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="flex items-start gap-2.5 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm shrink-0 border border-saffron-200">
                        👳🏽
                      </div>
                      <div className="p-4 rounded-2xl bg-white text-gray-800 border border-saffron-100 rounded-tl-none shadow-xs">
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-saffron-500" />
                          <span>Pandit Ji is consulting astral almanac/scriptures...</span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <span className="w-2 h-2 rounded-full bg-saffron-400 animate-bounce delay-100"></span>
                          <span className="w-2 h-2 rounded-full bg-saffron-500 animate-bounce delay-200"></span>
                          <span className="w-2 h-2 rounded-full bg-saffron-600 animate-bounce delay-300"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef}></div>
              </div>

              {/* Dynamic Gatekeeper Input or Form */}
              {userMsgsCount >= 3 && !hasDirectPanditAccess ? (
                <div className="p-6 bg-linear-to-b from-amber-50 to-orange-50/50 border-t border-saffron-150 text-center space-y-4 animate-fadeIn">
                  <div className="w-12 h-12 bg-amber-100/90 border border-saffron-300 rounded-full flex items-center justify-center mx-auto text-xl">
                    🕉️
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h4 className="text-sm font-extrabold text-saffron-850 uppercase tracking-widest font-display">Complimentary AI Queries Completed</h4>
                    <p className="text-xs text-gray-650 leading-relaxed font-sans">
                      Pranam Devotee! You have requested 3 free guidance summaries. Continuous astrological deep-dives, specialized Gotra muhurats, and directly discussing with {settings.panditName || 'Shyam Guru ji'} on a personal phone call require a small **Shradha Dakshina (Vedic token)**.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          setLoginTab('signin');
                          setIsLoginModalOpen(true);
                          alert("Please Sign In first to lock your devotee account and order standard consultations.");
                        } else {
                          setConsultFormName(currentUser.fullName);
                          setConsultFormPhone(currentUser.phone);
                          setConsultFormGothra(currentUser.gothra || '');
                          setIsConsultModalOpen(true);
                        }
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl transition duration-150 text-xs shadow-md cursor-pointer uppercase tracking-wider flex-1 animate-pulse"
                    >
                      {previouslyPaidPandit ? `Renew Call & Chat (₹125)` : `Unlock Direct Pandit (₹251)`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pujas')}
                      className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex-1"
                    >
                      Pujas Catalog
                    </button>
                  </div>
                  <p className="text-[10.5px] text-gray-400 font-medium">✨ This unlocks 24 Hours of direct text counseling and premium voice call service.</p>
                </div>
              ) : (
                <>
                  {/* Prompt Helper Pills */}
                  <div className="p-3 bg-saffron-50/50 border-t border-saffron-100 overflow-x-auto whitespace-nowrap flex items-center gap-2 text-xs no-scrollbar">
                    <span className="text-gray-400 font-bold uppercase text-[9px] shrink-0">Ask Swami Ji:</span>
                    {[
                      "Which puja helps clear commercial business debts?",
                      "Suggest a remedial mantra for recovering our sick elders",
                      "What items are in standard Satyanarayan samagri kit?",
                      "Can you check dynamic dates for Griha Pravesh home warmth?"
                    ].map((pillText, i) => (
                      <button
                        key={i}
                        onClick={() => triggerChatPill(pillText)}
                        className="bg-white hover:bg-saffron-100 text-saffron-700 border border-saffron-150 px-3 py-1.5 rounded-full cursor-pointer transition duration-150 text-xs shadow-xs"
                      >
                        {pillText}
                      </button>
                    ))}
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleChatSubmit} className="p-3 border-t border-saffron-100 bg-white flex gap-2">
                    <input
                      id="chat-input-box"
                      type="text"
                      value={userChatInput}
                      onChange={(e) => setUserChatInput(e.target.value)}
                      placeholder={hasDirectPanditAccess ? `Type your premium direct query to ${settings.panditName || 'Shyam Guru ji'}...` : `Ask ${settings.panditName || 'Shyam Guru ji'} about Gothras, rituals, package options...`}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:border-transparent text-sm text-gray-800"
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      className="bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-5 py-2.5 rounded-xl transition duration-150 text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      disabled={chatLoading || !userChatInput.trim()}
                      id="send-chat-btn"
                    >
                      <span>{hasDirectPanditAccess ? "Verify & Speak" : "Sankalp Query"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}

            </div>
          );
        })()}

        {/* TAB 3: CUSTOMER MY BOOKINGS DASHBOARD */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-fadeIn" id="bookings-dashboard-view">
            {!currentUser ? (
              <div className="bg-white rounded-2xl border border-saffron-100 p-12 text-center max-w-lg mx-auto shadow-md space-y-6">
                <div className="w-16 h-16 rounded-full bg-saffron-50 border border-saffron-100 flex items-center justify-center mx-auto text-saffron-600">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800 font-display">Devotee Login Required</h4>
                  <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    To access your personalized spiritual bookings dashboard, view scheduled Yajnas, or participate in secure interactive live E-Pujas, please sign into your devotee account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab('signin');
                    setIsLoginModalOpen(true);
                  }}
                  className="bg-linear-to-r from-saffron-600 to-amber-500 hover:from-saffron-700 hover:to-amber-600 text-white px-6 py-2.5 rounded-full text-xs font-bold transition duration-150 cursor-pointer shadow hover:shadow-md uppercase tracking-wider mx-auto inline-block"
                  id="bookings-login-prompt-btn"
                >
                  Sign In / Create Account
                </button>
              </div>
            ) : (() => {
              const userBookings = bookings.filter(
                (b) => b.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
              );
              return (
                <>
                  {/* Header summary */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-2xl font-extrabold text-saffron-800 font-display">Devotee Booking Records</h3>
                      <p className="text-xs text-gray-500">Secure digital dashboard tracking active Yajnas & Priest schedules</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-saffron-100/50 border border-saffron-200 px-3 py-1.5 rounded-lg text-saffron-800 font-medium">
                      <CheckCircle2 className="w-4.5 h-4.5 text-saffron-600" />
                      <span>{userBookings.length} Total Bookings Enrolled</span>
                    </div>
                  </div>

                  {userBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-lg mx-auto shadow-md">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-bold text-gray-700 font-display">No Saved Ritual Bookings Found</h4>
                      <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                        Pranam {currentUser.fullName}, you have no pending or confirmed bookings active under <span className="font-semibold text-gray-750 font-mono text-[10px]">{currentUser.email}</span>. Explore our directory and complete a booking via secure payment gateway to start!
                      </p>
                      <button
                        onClick={() => setActiveTab('pujas')}
                        className="mt-6 bg-saffron-600 hover:bg-saffron-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                      >
                        Explore Holy Pujas Catalog
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {userBookings.map((bkg) => (
                        <div 
                          key={bkg.id} 
                          className="bg-white rounded-2xl border border-saffron-100/80 shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300"
                          id={`booking-record-${bkg.id}`}
                        >
                          <div>
                            {/* Top booking badge row */}
                            <div className="flex justify-between items-start gap-2 mb-3.5 pb-3.5 border-b border-dashed border-gray-100">
                              <div>
                                <p className="text-[10px] font-mono text-gray-400 uppercase font-semibold">Booking Reference</p>
                                <p className="font-mono text-xs font-bold text-saffron-700" id={`booking-id-tag-${bkg.id}`}>{bkg.id}</p>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                  {bkg.status}
                                </span>
                              </div>
                            </div>

                            {/* Major Ritual Details */}
                            <div className="flex gap-4">
                              <img 
                                src={bkg.pujaImage} 
                                alt={bkg.pujaName} 
                                className="w-16 h-16 rounded-xl object-cover border border-saffron-100 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <h4 className="text-lg font-bold text-gray-900 font-display leading-tight">{bkg.pujaName}</h4>
                                <p className="text-xs text-saffron-600 font-semibold mt-1">{bkg.packageName}</p>
                                <p className="text-[11px] text-gray-500 font-mono mt-0.5 font-semibold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                                  <span>Scheduled: {new Date(bkg.dateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(bkg.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                              </div>
                            </div>

                            {/* Devotee Metadata Summary */}
                            <div className="mt-4 bg-saffron-50/20 border border-saffron-100/40 rounded-xl p-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Devotee Host</p>
                                <p className="font-semibold text-gray-700">{bkg.customerName}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Gothra Chanted</p>
                                <p className="font-semibold text-gray-700">{bkg.gothra}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Nakshatra Star</p>
                                <p className="font-semibold text-gray-700">{bkg.nakshatra || "Universal"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Recitation Language</p>
                                <p className="font-semibold text-gray-700">{bkg.language}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Ceremonial Mode</p>
                                <p className="font-bold text-saffron-700 uppercase flex items-center gap-1 text-[11px]">
                                  {bkg.mode === 'e-puja' ? (
                                    <>
                                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Interactive E-Puja</span>
                                    </>
                                  ) : (
                                    <>
                                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                                      <span>At Devotee Home</span>
                                    </>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Dakshina Settlement</p>
                                <p className="font-bold text-gray-800 font-mono">₹{bkg.price.toLocaleString()} Paid</p>
                              </div>
                            </div>

                            {bkg.address && (
                              <div className="mt-3 p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs leading-normal">
                                <strong className="text-gray-500 font-semibold uppercase text-[10px] block">Priest Visit Location:</strong>
                                <span className="text-gray-600 font-medium inline-block mt-0.5">{bkg.address}</span>
                              </div>
                            )}

                            {bkg.notes && (
                              <p className="text-xs text-gray-500 italic mt-3 pl-2.5 border-l-2 border-saffron-300">
                                "Sankalpa note: {bkg.notes}"
                              </p>
                            )}
                          </div>

                          {/* Dashboard actions row */}
                          <div className="mt-5 pt-4 border-t border-gray-150 flex flex-wrap gap-2 justify-between items-center bg-gray-50/50 p-2.5 rounded-xl">
                            <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                              <span>MCI Secure verified txn</span>
                            </div>

                            <div className="flex gap-2 text-xs">
                              {/* If E-Puja, provide interactive Virtual Mandir experience */}
                              {bkg.mode === 'e-puja' ? (
                                <button
                                  onClick={() => setActiveEpujaLive(bkg)}
                                  className="bg-linear-to-r from-saffron-600 to-saffron-500 text-white font-bold px-4 py-2 rounded-xl transition duration-150 flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
                                  id={`join-epuja-btn-${bkg.id}`}
                                >
                                  <Play className="w-3.5 h-3.5 text-white animate-pulse" />
                                  <span>Join Live Virtual Puja Altar</span>
                                </button>
                              ) : (
                                <div className="bg-amber-100/60 text-amber-900 border border-amber-200 text-[11px] font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping"></span>
                                  <span>Pandit Ji dispatched on muhurat</span>
                                </div>
                              )}
                              
                              <button
                                onClick={() => {
                                  alert(`\n--- Pooja4Panditji Receipt ---\n\nBooking ID: ${bkg.id}\nDevotee: ${bkg.customerName}\nPuja Selected: ${bkg.pujaName}\nDakshina Total: ₹${bkg.price}\nPayment Mode: ${bkg.paymentMethod}\nStatus: ${bkg.status.toUpperCase()}\n\nVerified Securely via SSL Gateways.`);
                                }}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl transition duration-150 flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Invoice</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

          </div>
        )}

        {/* TAB 4: ADMIN PORTAL */}
        {activeTab === 'admin' && (
          <AdminPortal 
            bookings={bookings} 
            setBookings={setBookings}
            pujas={pujas} 
            setPujas={setPujas} 
            settings={settings}
            setSettings={setSettings}
            users={users}
          />
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-neutral-900 text-neutral-400 border-t-4 border-saffron-600 pt-12 pb-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold font-display text-saffron-500">ॐ</span>
              <span className="text-xl font-bold font-display text-white tracking-wide">Pooja4Panditji</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed font-sans">
              Dedicated to restoring absolute purity and Vedic precision in domestic sacrificial rituals. Trusted by premium households worldwide for online, temple, and in-person bookings.
            </p>
            <div className="mt-4 flex gap-3 text-xs">
              <span className="bg-neutral-800 text-gold-300 px-2 py-1.5 rounded border border-neutral-700 uppercase font-mono tracking-wider font-semibold">SSL SECURED ENCRYPTED</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 font-display">Sacred Services</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => { setActiveTab('pujas'); setActiveCategory('prosperity'); }} className="hover:text-white transition duration-150 cursor-pointer">Sri Satyanarayan Vrat Path</button></li>
              <li><button onClick={() => { setActiveTab('pujas'); setActiveCategory('remedial'); }} className="hover:text-white transition duration-150 cursor-pointer">Maha Mrityunjaya Healing Jaap</button></li>
              <li><button onClick={() => { setActiveTab('pujas'); setActiveCategory('peace'); }} className="hover:text-white transition duration-150 cursor-pointer text-left">Maha Rudrabhishek with Panchamrit</button></li>
              <li><button onClick={() => { setActiveTab('pujas'); setActiveCategory('milestones'); }} className="hover:text-white transition duration-150 cursor-pointer">Vastu Shanti & Dwar ceremony</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 font-display">Pandit Shastris</h4>
            <ul className="space-y-2 text-xs">
              <li>Verified background credentials</li>
              <li>Trained at Kashi Vidyapeeth Banaras</li>
              <li>Sourcing pristine raw cow ghee & materials</li>
              <li>Fluency in Vedic swaras & chanting scales</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 font-display">Secure & Safe Portal</h4>
            <p className="text-xs leading-relaxed text-neutral-400 mb-2">
              All electronic payments are routed via authorized banking gateways under strict secure credentials.
            </p>
            <div className="p-3 bg-neutral-800 rounded-lg border border-neutral-700 text-[11px] leading-snug">
              <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>✨ {settings.panditName || 'Shyam Guru ji'} Support</span>
              </p>
              <p className="text-neutral-400 mt-1">Get immediate live assistance regarding material sourcing or custom family gothras.</p>
              <div className="mt-2.5 flex flex-wrap gap-3 items-center">
                <button 
                  onClick={() => setActiveTab('chat')} 
                  className="text-gold-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Launch Chatbot</span>
                </button>
                <span className="text-neutral-600">|</span>
                <a 
                  href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  referrerPolicy="no-referrer"
                  className="text-green-400 hover:text-green-300 font-bold flex items-center gap-1 transition"
                >
                  <span>💬 Connect on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between text-xs text-neutral-500">
          <p>© 2026 Pooja4Panditji. Handcrafted with authentic Vedic pride and micro-design layout standards.</p>
          <div className="flex gap-4 mt-2 sm:mt-0 font-medium">
            <span className="hover:text-neutral-400 cursor-pointer">Privacy Safeguards</span>
            <span>•</span>
            <span className="hover:text-neutral-400 cursor-pointer" onClick={() => setIsTermsModalOpen(true)}>Devotee Terms of Use</span>
          </div>
        </div>
      </footer>


      {/* MODAL 1: DYNAMiC BOOKING WIZARD & SECURE PAYMENT GATEWAY */}
      {selectedPuja && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" id="booking-modal-overlay">
          
          <div className="relative bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-saffron-100 flex flex-col max-h-[90vh] animate-slideUp">
            
            {/* Modal Heading Header */}
            <div className="bg-linear-to-r from-saffron-600 via-saffron-500 to-amber-600 text-white p-5 pr-12">
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-gold-200">Spiritual Booking Wizard</span>
              <h3 className="text-xl sm:text-2xl font-bold font-display mt-0.5">{selectedPuja.name}</h3>
              <p className="text-xs text-saffron-50 mt-1 font-medium">{selectedPuja.sanskritName} • Guided in pure alignment</p>
              
              <button
                onClick={() => setSelectedPuja(null)}
                className="absolute top-4 right-4 text-white hover:text-gold-200 bg-black/10 hover:bg-black/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg select-none transition-all focus:outline-none"
                id="close-booking-modal-btn"
              >
                ✕
              </button>
            </div>

            {/* Steps Visual Tracker */}
            <div className="bg-saffron-50 px-6 py-3 border-b border-saffron-100/50 flex justify-between text-xs font-semibold text-gray-500">
              {[
                { id: 'package', num: 1, text: 'Select Tier' },
                { id: 'form', num: 2, text: 'Devotee Form' },
                { id: 'payment', num: 3, text: 'Secure Payment' },
                { id: 'otp', num: 4, text: 'Veda OTP Verification' },
              ].map((step) => (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-1.5 pb-1 border-b-2 transition duration-200 ${
                    bookingStep === step.id 
                    ? 'text-saffron-600 border-saffron-500 font-bold' 
                    : (bookingStep === 'form' && step.id === 'package') || 
                      (bookingStep === 'payment' && (step.id === 'package' || step.id === 'form')) ||
                      (bookingStep === 'otp' && step.id !== 'otp')
                      ? 'text-green-600 border-green-500 font-bold'
                      : 'border-transparent text-gray-400'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    bookingStep === step.id 
                      ? 'bg-saffron-600 text-white' 
                      : (bookingStep === 'form' && step.id === 'package') || 
                        (bookingStep === 'payment' && (step.id === 'package' || step.id === 'form'))
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>{step.num}</span>
                  <span className="hidden xs:inline">{step.text}</span>
                </div>
              ))}
            </div>

            {/* Scrollable Wizard content container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* STEP 1: PACKAGE DETAIL TIER SEEMS COMPACT */}
              {bookingStep === 'package' && selectedPackage && (
                <div className="space-y-6 animate-fadeIn" id="step-select-package">
                  <div className="text-center max-w-md mx-auto space-y-1">
                    <h4 className="font-extrabold text-gray-900 font-display text-lg">Choose Your Vedic Package</h4>
                    <p className="text-xs text-gray-500 leading-normal">Each tier provides authenticated recitation with varied physical materials, Assistant Pandits, and homas.</p>
                  </div>

                  {/* Horizontal visual cards layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedPuja.packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        onClick={() => handlePackageSelect(pkg)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition duration-150 flex flex-col justify-between ${
                          selectedPackage.id === pkg.id
                            ? 'bg-saffron-50/50 border-saffron-500 ring-2 ring-saffron-100 shadow-md'
                            : 'bg-white border-gray-150 hover:border-saffron-200 hover:bg-saffron-50/10'
                        }`}
                        id={`package-tier-${pkg.id}`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded font-bold ${
                              pkg.id === 'premium' ? 'bg-amber-100 text-amber-800' : pkg.id === 'standard' ? 'bg-saffron-100 text-saffron-800' : 'bg-gray-100 text-gray-700'
                            }`}>{pkg.id}</span>
                            <span className="text-lg font-bold font-mono text-saffron-700">₹{pkg.price.toLocaleString()}</span>
                          </div>
                          
                          <h5 className="font-bold font-display text-gray-900 text-base mt-2">{pkg.name}</h5>
                          <p className="text-xs text-gray-500 leading-tight mt-1">{pkg.description}</p>
                          
                          <ul className="space-y-1.5 mt-4 text-[11px] text-gray-600">
                            {pkg.benefits.map((b, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <Check className="w-3.5 h-3.5 text-saffron-500 shrink-0 mt-0.5" />
                                <span className="leading-tight">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-4 border-t border-dashed border-gray-150 mt-4 text-[10px] text-gray-400">
                          <p className="font-semibold text-gray-500 uppercase tracking-wider">Dakshina Inclusions:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pkg.dakshinaInclusions.map((d, i) => (
                              <span key={i} className="bg-gray-150 px-1.5 py-0.5 rounded text-[9px] text-gray-500 font-medium">{d}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-saffron-50 p-4 border border-saffron-150 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="bg-saffron-100 p-2 rounded-full text-saffron-700">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">Complete Vedic Samagri Shipped Included</p>
                        <p className="text-[11px] text-gray-500">All direct standard and premium orders includes absolute flower & material kits.</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-saffron-700 bg-white border border-saffron-200 px-2.5 py-1 rounded-full uppercase">Kashi Pure Sourced</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => setBookingStep('form')}
                      className="bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-6 py-3 rounded-xl transition duration-150 text-sm flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
                      id="pkg-next-btn"
                    >
                      <span>Custom Details & Timing</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DETAILS ENROLLMENT FORM */}
              {bookingStep === 'form' && selectedPackage && (
                <form onSubmit={handlePersonalFormSubmit} className="space-y-5 animate-fadeIn" id="step-devotee-form">
                  
                  <div className="p-3 bg-saffron-50 rounded-lg border border-saffron-200 flex items-center gap-2.5 text-xs text-saffron-850">
                    <Award className="w-4.5 h-4.5 text-saffron-600 shrink-0" />
                    <div>
                      <strong>Auspicious Selection: </strong>
                      You have selected the {selectedPackage.name} for <span className="font-mono font-bold">₹{selectedPackage.price}</span>. Fill the authentic Brahmin details below.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Devotee name input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Devotee Full Name *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><User className="w-4.5 h-4.5" /></span>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            if(!sankalpNames) setSankalpNames(e.target.value);
                          }}
                          placeholder="e.g. Vikas Savita"
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Address *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><Mail className="w-4.5 h-4.5" /></span>
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="e.g. vikas.savita@smollan.com"
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
                        />
                      </div>
                    </div>

                    {/* Phone Number Input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phone Number *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><Phone className="w-4.5 h-4.5" /></span>
                        <input
                          type="text"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
                        />
                      </div>
                    </div>

                    {/* Date/Time Picker */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Select Muhurat Date & Time *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><Calendar className="w-4.5 h-4.5" /></span>
                        <input
                          type="datetime-local"
                          required
                          value={dateTime}
                          onChange={(e) => setDateTime(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500 text-gray-700"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-1">Our Astrologer will cross-check the exact transition align matching this standard timing.</span>
                    </div>

                    {/* Optional Hindu Astrological credentials */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Gothra (Heritage Clan)</label>
                      <input
                        type="text"
                        value={gothra}
                        onChange={(e) => setGothra(e.target.value)}
                        placeholder="e.g. Kashyap, Bhardwaj (Leave empty if unsure)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nakshatra (Birth star Alignment)</label>
                      <input
                        type="text"
                        value={nakshatra}
                        onChange={(e) => setNakshatra(e.target.value)}
                        placeholder="e.g. Rohini, Ashlesha, Krittika"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
                      />
                    </div>
                  </div>

                  {/* SANKALP LIST */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Sankalp Names (Family members to include in prayers)</label>
                    <input
                      type="text"
                      value={sankalpNames}
                      onChange={(e) => setSankalpNames(e.target.value)}
                      placeholder="e.g. Vikas Savita, Ramesh Savita, Sunita Savita"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    />
                    <span className="text-[10px] text-gray-400 block mt-1">The Pandit ji will explicitly call out these names during the initial water-dropping Sankalp ceremony!</span>
                  </div>

                  {/* Operational Settings options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-150 rounded-2xl">
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Ritual Delivery Mode</label>
                      <select
                        value={pujaMode}
                        onChange={(e: any) => setPujaMode(e.target.value)}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-saffron-500"
                      >
                        <option value="in-person-home">Pandit Ji visits my Home (Offline)</option>
                        <option value="e-puja">Interactive Live Zoom Video (E-Puja)</option>
                        <option value="in-person-temple">Conducted at Local Vedic Temple on my behalf</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 font-sans">Recitation Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-saffron-500"
                      >
                        <option value="Hindi & Sanskrit">Hindi & Sanskrit (Standard)</option>
                        <option value="Sanskrit Only">Vedic Sanskrit Only (Scholarly)</option>
                        <option value="English, Hindi & Sanskrit">English, Hindi & Sanskrit Translation</option>
                        <option value="Tamil & Sanskrit">Tamil & Sanskrit (Bhaktivilas)</option>
                        <option value="Bengali & Sanskrit">Bengali & Sanskrit (Shaktisutra)</option>
                      </select>
                    </div>

                    {/* Include custom high quality samagri toggle */}
                    <div className="col-span-1 sm:col-span-2 pt-2 border-t border-gray-200/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          id="samagri-check"
                          type="checkbox"
                          checked={includeSamagriKit}
                          onChange={(e) => setIncludeSamagriKit(e.target.checked)}
                          className="w-4 h-4 text-saffron-650 focus:ring-saffron-500 rounded border-gray-300"
                        />
                        <label htmlFor="samagri-check" className="text-xs font-bold text-gray-700 cursor-pointer">
                          I want the Complete Premium Samagri kit delivered to my address
                        </label>
                      </div>
                      
                      <div className="text-right text-xs">
                        {selectedPackage.includedSamagri ? (
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">FREE WITH TIER</span>
                        ) : (
                          <span className="text-saffron-700 font-bold bg-saffron-50 px-2 py-0.5 rounded border border-saffron-100">{includeSamagriKit ? '+ ₹1,250' : 'Excluded'}</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* PHYSICAL ADDRESS (Conditionally shown if Pandit Visits Home) */}
                  {pujaMode === 'in-person-home' && (
                    <div className="animate-fadeIn">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Priest Home Delivery Address *</label>
                      <textarea
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Complete Apartment/House Number, Floor, Street coordinates, City Pin code state."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
                      ></textarea>
                    </div>
                  )}

                  {/* Custom notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Additional Devotional Notes / Sankalpa desires</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Explain any physical illness factors, specific prayers requests, or instructions..."
                      rows={1}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    ></textarea>
                  </div>

                  {/* Navigation row */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setBookingStep('package')}
                      className="text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                    >
                      Back to Packages
                    </button>

                    <button
                      type="submit"
                      className="bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-6 py-2.5 rounded-xl transition duration-150 text-sm flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
                      id="details-submit-btn"
                    >
                      <span>Proceed to Payment</span>
                      <Lock className="w-4 h-4 text-gold-200" />
                    </button>
                  </div>

                </form>
              )}

              {/* STEP 3: SECURE TRANSACTION PAYMENT GATEWAY */}
              {bookingStep === 'payment' && selectedPackage && (
                <div className="space-y-6 animate-fadeIn" id="step-payment-gateway">
                  
                  {/* Security certificate strip */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 flex gap-3 text-emerald-900 justify-between items-center">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-9 h-9 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-sm uppercase tracking-wider">MCI Certified Encrypted Gateway</h4>
                        <p className="text-xs text-emerald-800 leading-normal">Your banking coordinates undergo secure TLS 1.3 socket hashing. No credit cards or UPI secrets are saved at Pooja4Panditji server limits.</p>
                      </div>
                    </div>
                    <div className="hidden sm:block shrink-0 bg-white/70 px-2.5 py-1 rounded border border-emerald-200 text-center font-mono text-[9px] font-bold text-emerald-700">
                      SSL SHA-256
                    </div>
                  </div>

                  {/* Billing breakdown Receipt */}
                  <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4">
                    <h5 className="font-extrabold text-xs text-gray-500 uppercase tracking-widest mb-2.5">Secure Order Summary</h5>
                    <div className="space-y-1.5 text-xs text-gray-700 font-medium">
                      
                      <div className="flex justify-between">
                        <span>Ritual Offering Name:</span>
                        <span className="font-bold text-gray-900">{selectedPuja.name}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Tier Selected:</span>
                        <span className="text-saffron-700 font-bold">{selectedPackage.name}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Pandit Dakshina, Travel & Service:</span>
                        <span className="font-mono">₹{selectedPackage.price.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Vedic Samagri delivery cargo:</span>
                        <span className="font-mono">
                          {selectedPackage.includedSamagri ? 'Included (Free)' : includeSamagriKit ? '₹1,250' : 'Excluded'}
                        </span>
                      </div>

                      <div className="flex justify-between pt-2 border-t border-dashed border-gray-200 text-sm font-extrabold text-gray-900">
                        <span className="font-display">Absolute Dakshina Total:</span>
                        <span className="font-mono text-saffron-700">₹{calculateTotalPrice().toLocaleString()}</span>
                      </div>

                    </div>
                  </div>

                  {/* Payment Methods tabs container */}
                  <div className="border border-gray-150 rounded-2xl overflow-hidden flex flex-col sm:flex-row h-[280px]">
                    
                    {/* Sidebar method select */}
                    <div className="w-full sm:w-1/3 bg-gray-50 border-r border-gray-150 flex flex-row sm:flex-col text-xs font-semibold">
                      {[
                        { id: 'upi', label: 'UPI QR & App Pay', icon: Smartphone },
                        { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                        { id: 'netbanking', label: 'Secure NetBanking', icon: Globe }
                      ].map((m) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={`flex flex-1 sm:flex-initial items-center gap-2 px-4 py-3 text-left transition duration-150 focus:outline-none cursor-pointer ${
                              paymentMethod === m.id
                                ? 'bg-white text-saffron-700 border-b-2 sm:border-b-0 sm:border-l-4 border-saffron-600'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            id={`pay-method-${m.id}`}
                          >
                            <Icon className="w-4 h-4 text-saffron-500" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Method details frame */}
                    <div className="flex-1 p-5 bg-white overflow-y-auto">
                      
                      {/* UPI OR QR METHOD PANEL */}
                      {paymentMethod === 'upi' && (
                        <div className="space-y-4 animate-fadeIn text-xs" id="pay-panel-upi">
                          <p className="text-gray-500 leading-normal">Scan the secure BHIM Unified Payments Interface QR code below utilizing GPay, PhonePe, Paytm, or enter your VPA string.</p>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-5 bg-saffron-50/20 p-3.5 rounded-xl border border-saffron-100">
                            {settings.upiQrUrl ? (
                              <img 
                                src={settings.upiQrUrl} 
                                alt="Temple Custom QR" 
                                className="w-28 h-28 object-contain rounded-lg border border-gray-150 p-1 shrink-0 bg-white shadow-sm"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=200";
                                }}
                              />
                            ) : (
                              /* Dynamic visual representation containing merchant UPI custom ID */
                              <div className="w-28 h-28 bg-white p-2 rounded-lg border border-gray-150 shadow-inner shrink-0 relative flex flex-col items-center justify-center font-display text-2xl">
                                <span className="text-3xl text-saffron-500 select-none">ॐ</span>
                                <div className="grid grid-cols-2 gap-1 w-full h-full absolute inset-2 bg-gradient-to-tr from-saffron-700 via-white to-gold-600 opacity-15 pointer-events-none"></div>
                                <span className="text-[7.5px] font-mono font-bold text-gray-500 absolute bottom-1 shrink-0 truncate max-w-[100px] text-center">{settings.upiId}</span>
                              </div>
                            )}
                            
                            <div className="space-y-1 text-center sm:text-left flex-1">
                              <span className="bg-saffron-100 text-saffron-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded">UPI SECURE VERIFIED</span>
                              <p className="font-bold text-sm text-gray-700 mt-1">Beneficiary: Pooja4Panditji Mandir Trust</p>
                              <p className="text-[11px] font-mono text-gray-500">Merchant VPA: <span className="font-bold text-saffron-700">{settings.upiId}</span></p>
                              <p className="text-[11px] font-mono text-gray-400">QR Session TTL: <span className="text-red-500 font-bold">{formatTime(qrCountdown)}</span></p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[10px] uppercase font-bold text-gray-500">Or Enter Devotee UPI VPA Address</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="eg. vikas.savita@okaxis"
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-saffron-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CREDIT CARD PANEL */}
                      {paymentMethod === 'card' && (
                        <div className="space-y-3.5 animate-fadeIn text-xs" id="pay-panel-card">
                          <p className="text-gray-500 leading-normal">Enter secure Visa, MasterCard, or RuPay coordinates. Data is encrypted using local AES-256 logic blocks.</p>
                          
                          <div className="space-y-2">
                            <label className="block text-[10px] uppercase font-bold text-gray-500">16-Digit Card Number</label>
                            <input
                              type="text"
                              required
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              placeholder="4111 •••• •••• 1008"
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs uppercase font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-gray-500">Card Expiration</label>
                              <input
                                type="text"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                placeholder="MM/YY"
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-gray-500">Secure CVV PIN</label>
                              <input
                                type="password"
                                maxLength={3}
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                placeholder="•••"
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500">Cardholder Full Name</label>
                            <input
                              type="text"
                              value={cardHolder}
                              onChange={(e) => setCardHolder(e.target.value)}
                              placeholder="e.g. Vikas Savita"
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* NETBANKING PANEL */}
                      {paymentMethod === 'netbanking' && (
                        <div className="space-y-4 animate-fadeIn text-xs" id="pay-panel-netbanking">
                          <p className="text-gray-500 leading-normal">Select from premium certified Indian Banks. Secured via direct multi-factor API handshake integrations.</p>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'sbi', name: 'State Bank of India (SBI)' },
                              { id: 'hdfc', name: 'HDFC Secure NetBank' },
                              { id: 'icici', name: 'ICICI iMobile Direct' },
                              { id: 'axis', name: 'Axis Bank Gate' }
                            ].map((bank) => (
                              <button
                                key={bank.id}
                                type="button"
                                onClick={() => setSelectedBank(bank.id)}
                                className={`p-2.5 rounded-lg border text-left font-medium transition duration-150 ${
                                  selectedBank === bank.id
                                    ? 'border-saffron-500 bg-saffron-50/50 text-saffron-700'
                                    : 'border-gray-150 hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                🇮🇳 {bank.name}
                              </button>
                            ))}
                          </div>
                          
                          <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-gray-400 text-[10px] leading-tight">
                            Upon secure pay initiation, we simulate the redirection loop to chosen banks portal interface for secure login and account clearance.
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Operational navigation */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setBookingStep('form')}
                      className="text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                    >
                      Back to Devotee Form
                    </button>

                    <button
                      type="button"
                      disabled={paymentProcessing}
                      onClick={handlePaymentInitiate}
                      className="bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold px-7 py-3 rounded-xl transition duration-150 text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                      id="init-pay-btn"
                    >
                      {paymentProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating Encrypted SMS PIN...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4.5 h-4.5 text-white" />
                          <span>Secure Pay ₹{calculateTotalPrice().toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 4: SMS OTP VERIFICATION FRAME */}
              {bookingStep === 'otp' && selectedPackage && (
                <div className="space-y-6 animate-fadeIn max-w-md mx-auto text-center py-4" id="step-otp-verification">
                  
                  <div className="w-14 h-14 bg-saffron-50 border border-saffron-150 rounded-full flex items-center justify-center text-saffron-700 mx-auto text-2xl shadow-sm">
                    🔒
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xl text-gray-900 font-display">Vedic OTP Code Required</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      A simulated 4-digit security code was dispatched to your hosted phone: <strong className="text-gray-800 font-semibold">{customerPhone || "+91 98765 43210"}</strong> for instant authentication.
                    </p>
                  </div>

                  {/* Informational tip displaying the sacred OTP */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-normal">
                    <span className="font-bold">✨ Spiritual SMS Mock Gateway Notification:</span>
                    <p className="font-mono text-xs font-extrabold text-saffron-700 mt-1">"Your Pooja4Panditji transaction private OTP is: {sentOtpCode}"</p>
                  </div>

                  <div className="space-y-3">
                    <input
                      id="otp-input-field"
                      type="text"
                      maxLength={4}
                      value={userOtp}
                      onChange={(e) => {
                        setUserOtp(e.target.value);
                        setOtpError('');
                      }}
                      placeholder="Enter 4-digit Code"
                      className="w-1/2 mx-auto text-center tracking-[0.5em] font-mono text-xl font-bold py-2.5 border-2 border-saffron-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    />
                    
                    {otpError && (
                      <p className="text-xs font-semibold text-red-500" id="otp-error-line">
                        {otpError}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 space-y-2.5">
                    <button
                      type="button"
                      disabled={paymentProcessing}
                      onClick={handleOtpVerify}
                      className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-3 px-6 rounded-xl text-sm shadow-md hover:shadow-lg transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      id="otp-verify-submit-btn"
                    >
                      {paymentProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Encrypting Dakshina Hashing Ledger...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4.5 h-4.5" />
                          <span>Verify & Authorize Safe Ritual</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        alert(`A new sacred OTP PIN was dispatched securely to your device. Try: ${sentOtpCode}`);
                      }}
                      className="text-xs text-gray-500 hover:text-saffron-700 transition font-bold"
                    >
                      Resend SMS OTP Gateway Code
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 5: BOOKING SUCCESS CELEBRATED BANNER */}
              {bookingStep === 'success' && lastCreatedBooking && (
                <div className="space-y-6 animate-fadeIn py-6 text-center max-w-lg mx-auto" id="step-booking-success">
                  
                  {/* Dynamic sacred sparks representation */}
                  <div className="w-16 h-16 rounded-full bg-grow-700 bg-emerald-500 text-white border-4 border-white shadow-xl flex items-center justify-center text-3xl mx-auto animate-bounce holy-glow-effect">
                    ✓
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-extrabold text-2xl font-display text-emerald-700">Blessings Dispatched Successfully!</h3>
                    <p className="text-xs text-gray-500 font-medium">Your puja reservation has entered the cosmic ledger. Our Vedic Pandits are performing preliminary coordinate alignments right now.</p>
                  </div>

                  {/* Summary card details */}
                  <div className="bg-saffron-50/50 border border-saffron-100 rounded-2xl p-5 text-xs text-left space-y-2">
                    
                    <div className="flex justify-between border-b border-saffron-100 pb-2">
                      <strong className="text-gray-500">Booking Reference:</strong>
                      <span className="font-mono font-bold text-saffron-700">{lastCreatedBooking.id}</span>
                    </div>

                    <div className="flex justify-between pt-1">
                      <strong className="text-gray-500">Host Devotee:</strong>
                      <span className="font-semibold text-gray-800">{lastCreatedBooking.customerName}</span>
                    </div>

                    <div className="flex justify-between pt-1">
                      <strong className="text-gray-500">Puja Scheduled:</strong>
                      <span className="font-semibold text-gray-800">{lastCreatedBooking.pujaName}</span>
                    </div>

                    <div className="flex justify-between pt-1">
                      <strong className="text-gray-500">Mode Selected:</strong>
                      <span className="font-bold text-saffron-700 uppercase">{lastCreatedBooking.mode === 'e-puja' ? 'E-Puja Live Stream' : 'Home Visiting Pandit'}</span>
                    </div>

                    <div className="flex justify-between pt-1">
                      <strong className="text-gray-500">Dakshina Cleared:</strong>
                      <span className="font-mono font-bold text-emerald-700">₹{lastCreatedBooking.price.toLocaleString()} Paid</span>
                    </div>

                    {lastCreatedBooking.meetingLink && (
                      <div className="mt-4 p-3 bg-white border border-saffron-200 rounded-xl leading-relaxed text-center">
                        <p className="text-xs font-extrabold text-gray-800">Your E-Puja live video room stream link:</p>
                        <a 
                          href={lastCreatedBooking.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-saffron-650 hover:text-saffron-800 font-mono font-bold text-[11px] underline flex items-center justify-center gap-1 mt-1 break-all"
                        >
                          <span>{lastCreatedBooking.meetingLink}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      </div>
                    )}

                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-neutral-600 text-xs text-left leading-normal">
                    <p className="font-bold text-orange-950">👳🏽 Message from Pandit {settings.panditName || 'Shyam Guru ji'}:</p>
                    <p className="text-xs text-orange-900 mt-1">"Pranam, dear host. Your Sankalp names have been filed in sacred coordinates. We will contact you on WhatsApp / email to confirm correct flower setups and pure home arrangements. May Lord Shiva clear absolute obstacles!"</p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        setSelectedPuja(null);
                        setActiveTab('bookings');
                      }}
                      className="flex-1 bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-3 pr-4 rounded-xl text-xs transition duration-150 cursor-pointer shadow-md"
                    >
                      Go to Devotee Dashboard
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedPuja(null);
                        setActiveTab('chat');
                        // Prepopulate chat text about user booking
                        triggerChatPill(`I just booked ${lastCreatedBooking.pujaName} with reference ID ${lastCreatedBooking.id}. Can you review our custom family Gothra and nakshatra star requirements?`);
                      }}
                      className="flex-1 bg-white hover:bg-saffron-50 text-saffron-700 border border-saffron-200 font-bold py-3 rounded-xl text-xs transition duration-150 cursor-pointer"
                    >
                      Discuss with {settings.panditName || 'Shyam Guru ji'}
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}


      {/* MODAL 2: HIGH FIDELITY LIVE VIRTUAL PUJA ALTAR (E-PUJA LIVE STREAM EXP) */}
      {activeEpujaLive && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col sm:p-4 text-white overflow-y-auto" id="virtual-temple-overlay-fullscreen">
          
          <div className="w-full max-w-5xl mx-auto bg-neutral-900 sm:rounded-3xl border border-saffron-500/20 overflow-hidden shadow-2xl flex flex-col h-full sm:h-[88vh] my-auto">
            
            {/* Live streaming header */}
            <div className="p-4 bg-linear-to-r from-saffron-900 via-neutral-900 to-saffron-950 border-b border-saffron-500/20 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 bg-red-600 rounded-full animate-ping shrink-0"></div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base font-display flex items-center gap-1 text-gold-100">
                    Live Virtual Devotional altar stream
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono tracking-wide">Ritual: {activeEpujaLive.pujaName} ({activeEpujaLive.packageName})</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-red-950/80 text-red-400 border border-red-900 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-widest font-mono">
                  LIVE INTERACTIVE
                </span>
                
                <button
                  onClick={() => setActiveEpujaLive(null)}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer focus:outline-none"
                  id="close-epuja-altar-btn"
                >
                  Exit Temple Altar
                </button>
              </div>
            </div>

            {/* Main viewports split */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-black">
              
              {/* Left video view */}
              <div className="flex-1 p-4 flex flex-col justify-between relative bg-linear-to-b from-neutral-950 via-neutral-900 to-neutral-950">
                
                {/* Simulated high quality interactive webcam player */}
                <div className="w-full h-full max-h-[420px] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 relative flex flex-col items-center justify-center p-4">
                  
                  {/* Subtle temple background vector simulated via dark aesthetics */}
                  <div className="absolute inset-0 bg-cover bg-center bg-opacity-20 pointer-events-none filters opacity-30 select-none" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&q=80&w=600')` }}></div>
                  
                  {/* Dynamic Chants Overlay block */}
                  <div className="absolute top-4 left-4 right-4 text-center z-10">
                    <p className="text-[10px] text-gold-300 font-bold uppercase tracking-widest bg-black/40 border border-white/5 inline-block px-3 py-1 rounded-full backdrop-blur-md">Vedic Chanting Resonance</p>
                    <div className="p-3 bg-saffron-950/60 border border-saffron-500/20 rounded-xl mt-2 backdrop-blur-md text-xs sm:text-sm font-semibold max-w-lg mx-auto font-display text-orange-200">
                      "{chantsShown[activeChantIndex]}"
                    </div>
                  </div>

                  {/* Active representation representing Pandits interactive webcam */}
                  <div className="relative text-center p-8 space-y-4">
                    <div className="text-6xl sm:text-7xl select-none animate-pulse">{settings.panditImage || '👳🏽'}</div>
                    <div>
                      <h4 className="text-gold-200 font-bold font-display text-lg">Pandit {settings.panditName || 'Shyam Guru ji'}</h4>
                      <p className="text-[11px] text-gray-400 mt-1">Initiating Panchamrit & Camphor sequence</p>
                    </div>

                    <div className="inline-flex gap-2 text-xs bg-black/50 px-3 py-1.5 rounded-full border border-white/5 text-gray-300">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-ping mt-1.5"></span>
                      <span>Devotees Connected: {activeEpujaLive.customerName}</span>
                    </div>
                  </div>

                  {/* Bottom bar inside video screen */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-black/60 px-3.5 py-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="text-xs text-gold-300 font-semibold flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-saffron-405" />
                      <span>Audio Saffron Stream Active (192kbps)</span>
                    </div>

                    <button
                      onClick={nextSloka}
                      className="bg-saffron-600 hover:bg-saffron-700 text-[10px] font-bold text-white px-2.5 py-1.5 rounded-lg transition uppercase tracking-wide cursor-pointer text-xs"
                    >
                      Next Vedic Sloka →
                    </button>
                  </div>

                </div>

                {/* Simulated physical layout control: Devotional interactive actions */}
                <div className="mt-4 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-center space-y-3">
                  <span className="text-[10px] text-gold-200 font-bold tracking-widest uppercase block">Interact with Live Altar</span>
                  
                  <div className="flex justify-center gap-4">
                    
                    {/* Ring Temple Bell custom action */}
                    <button
                      onClick={ringTempleBell}
                      className={`px-5 py-3 rounded-2xl font-bold text-xs transition duration-150 shadow-md flex items-center gap-2 cursor-pointer ${
                        isBellRinging 
                          ? 'bg-gold-500 text-saffron-950 scale-95' 
                          : 'bg-neutral-800 hover:bg-neutral-700 text-gold-100 border border-neutral-700'
                      }`}
                      id="live-temple-bell-btn"
                    >
                      <span className="text-lg">🔔</span>
                      <span>Ring Pooja Temple Bell ({bellCount})</span>
                    </button>

                    {/* Sprinkle holy flower particles mock button */}
                    <button
                      onClick={() => {
                        alert("🌸 Dynamic virtual marigold flower offering sprinkled on Lord's holy feet! (Shubh Ashirwad)");
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-gold-100 border border-neutral-700 px-5 py-3 rounded-2xl font-bold text-xs transition duration-150 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-lg">🌸</span>
                      <span>Sprinkle Holy Flowers</span>
                    </button>

                  </div>
                </div>

              </div>

              {/* Right: metadata chat during recitation */}
              <div className="w-full lg:w-[320px] bg-neutral-950 border-t lg:border-t-0 lg:border-l border-neutral-800 p-4 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="border-b border-neutral-800 pb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gold-400 block font-mono">Sankalpam Chanted</span>
                    <p className="text-xs text-gray-300 mt-1 font-semibold leading-normal">Our Shastri coordinates are aligning your prayers. Retain highly meditative mental posture.</p>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <p className="font-bold text-gray-400 uppercase text-[9px] tracking-wider">Prayers Host:</p>
                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl leading-normal space-y-1">
                      <p><span className="text-gray-500 font-bold">Karta (Devotee):</span> {activeEpujaLive.customerName}</p>
                      <p><span className="text-gray-500 font-bold font-sans">Vedic Gothra:</span> {activeEpujaLive.gothra}</p>
                      <p><span className="text-gray-500 font-bold">Birth Star:</span> {activeEpujaLive.nakshatra}</p>
                      <p><span className="text-gray-500 font-bold">Sankalp Members:</span> {activeEpujaLive.sankalpNames}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-gray-400 uppercase text-[9px] tracking-wider">Live Puja Progress:</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>1. Initial Ganapati Dhyanam (Done)</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>2. General Gothra Sankalpam (Done)</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold text-orange-400 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        <span>3. Core Abhishek and Path Reciting (Active)</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-700"></span>
                        <span>4. Sacred Havan and Camphor Arti (Pending)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800 text-xs">
                  <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-[10px] text-gray-400 leading-normal text-center">
                    <p className="text-gold-300 font-bold flex items-center justify-center gap-1">
                      <span>✨ Virtual Altar Sanctuary</span>
                    </p>
                    <p className="mt-1">For pure home atmosphere, light incense and keep a copper cup of pure clean water beside your computer keyboard! (Subham)</p>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* DEVOTEE SIGN-IN & REGISTRATION MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans" id="devotee-login-modal">
          <div className="bg-white rounded-2xl border border-saffron-100 shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn text-xs text-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-saffron-600 to-amber-600 text-white p-5 relative">
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white font-bold text-base bg-black/10 hover:bg-black/20 w-7 h-7 rounded-full flex items-center justify-center transition"
                type="button"
              >
                ✕
              </button>
              <span className="text-[10px] tracking-widest uppercase font-mono font-bold text-gold-100">Sacred Devotee Portal</span>
              <h3 className="text-lg font-bold font-display mt-0.5">Access Your Spiritual Sanctuary</h3>
              <p className="text-[11px] text-saffron-100 mt-1">Sankalp auto-fills with Astrological attributes on signup</p>
            </div>

            {/* Selector Tabs */}
            <div className="flex border-b border-gray-150">
              <button
                type="button"
                onClick={() => setLoginTab('signin')}
                className={`flex-1 py-3 text-center font-bold tracking-wider uppercase text-[10px] transition ${
                  loginTab === 'signin' 
                    ? 'border-b-2 border-saffron-600 text-saffron-800 bg-saffron-50/20' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                id="tab-signin-trigger"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setLoginTab('signup')}
                className={`flex-1 py-3 text-center font-bold tracking-wider uppercase text-[10px] transition ${
                  loginTab === 'signup' 
                    ? 'border-b-2 border-saffron-600 text-saffron-800 bg-saffron-50/20' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                id="tab-signup-trigger"
              >
                Register Profile
              </button>
            </div>

            {/* Inner Content */}
            <div className="p-5 sm:p-6">
              {loginTab === 'signin' ? (
                /* SIGN IN FORM */
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const id = (form.elements.namedItem('loginId') as HTMLInputElement).value;
                    const pwd = (form.elements.namedItem('loginPwd') as HTMLInputElement).value;
                    
                    const matches = users.find(u => u.userId.toLowerCase() === id.toLowerCase() && u.passwordHash === pwd);
                    if (matches) {
                      setCurrentUser(matches);
                      setIsLoginModalOpen(false);
                      alert(`Pranam, ${matches.fullName}! Welcome to Pooja4Panditji.`);
                    } else {
                      alert("Divine authentication mismatch. Check User ID & Password. (Hint: vikas.savita@smollan.com / password123)");
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-semibold text-gray-500">Registered Email / User ID</label>
                    <input 
                      type="email"
                      required
                      name="loginId"
                      placeholder="eg. vikas.savita@smollan.com"
                      className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:ring-1 focus:ring-saffron-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-semibold text-gray-500">Security Password</label>
                    <input 
                      type="password"
                      required
                      name="loginPwd"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:ring-1 focus:ring-saffron-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-saffron-600 hover:bg-saffron-700 text-white text-xs font-bold rounded-lg uppercase tracking-wide shadow transition focus:outline-none cursor-pointer"
                  >
                    Enter Sanctuary Gate
                  </button>

                  <div className="text-center pt-2 text-[10.5px]">
                    <span className="text-gray-400">Default Devotee Log: </span>
                    <strong className="text-saffron-700 font-mono">vikas.savita@smollan.com / password123</strong>
                  </div>
                </form>
              ) : (
                /* SIGN UP / REGISTER FORM */
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('regName') as HTMLInputElement).value;
                    const email = (form.elements.namedItem('regEmail') as HTMLInputElement).value;
                    const pwd = (form.elements.namedItem('regPwd') as HTMLInputElement).value;
                    const phone = (form.elements.namedItem('regPhone') as HTMLInputElement).value;
                    const gothraVal = (form.elements.namedItem('regGothra') as HTMLInputElement).value;
                    const nakVal = (form.elements.namedItem('regNakshatra') as HTMLInputElement).value;

                    if (users.some(u => u.userId.toLowerCase() === email.toLowerCase())) {
                      alert("Devotee User ID is already occupied in the cosmic registries.");
                      return;
                    }

                    const newUser: UserAccount = {
                      userId: email,
                      passwordHash: pwd,
                      fullName: name,
                      phone,
                      email,
                      gothra: gothraVal || 'Kashyap',
                      nakshatra: nakVal || 'Ashwini',
                      createdAt: new Date().toISOString()
                    };

                    setUsers(prev => [...prev, newUser]);
                    setCurrentUser(newUser);
                    setIsLoginModalOpen(false);
                    alert(`Congratulations ${name}! Your authentic devotional credentials have been logged in the Mandir registers.`);
                  }}
                  className="space-y-3.5"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10.5px] font-semibold text-gray-600">Full Name</label>
                      <input 
                        type="text" required name="regName" placeholder="Karta Name"
                        className="w-full px-2.5 py-1.5 border border-gray-250 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10.5px] font-semibold text-gray-600">Primary Phone</label>
                      <input 
                        type="text" required name="regPhone" placeholder="+91 XXXXX XXXXX"
                        className="w-full px-2.5 py-1.5 border border-gray-250 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10.5px] font-semibold text-gray-600">Email Address</label>
                      <input 
                        type="email" required name="regEmail" placeholder="eg. user@email.com"
                        className="w-full px-2.5 py-1.5 border border-gray-250 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10.5px] font-semibold text-gray-600">Choose Password</label>
                      <input 
                        type="password" required name="regPwd" placeholder="••••••••"
                        className="w-full px-2.5 py-1.5 border border-gray-250 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10.5px] font-semibold text-gray-600">Vedic Gotra (Clan)</label>
                      <input 
                        type="text" name="regGothra" placeholder="eg. Bhardwaj, Shandilya"
                        className="w-full px-2.5 py-1.5 border border-gray-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10.5px] font-semibold text-gray-600">Nakshatra (Janma Star)</label>
                      <input 
                        type="text" name="regNakshatra" placeholder="eg. Rohini, Anuradha"
                        className="w-full px-2.5 py-1.5 border border-gray-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-400"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 italic">By signing up, your Gotra sounds are chanted directly during interactive online Sankalpams.</p>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-saffron-600 hover:bg-saffron-700 text-white text-xs font-bold rounded-lg uppercase tracking-wide shadow transition"
                  >
                    Register Devotional Profile
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIRECT PANDIT LIVE CONSULTATION SECURE CHECKOUT MODAL */}
      {isConsultModalOpen && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans animate-fadeIn" id="pandit-consult-checkout-modal">
          <div className="bg-white rounded-2xl border border-saffron-100 shadow-2xl max-w-lg w-full overflow-hidden text-xs text-gray-700">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-saffron-600 to-amber-600 text-white p-5 relative">
              <button 
                onClick={() => setIsConsultModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white font-bold text-base bg-black/10 hover:bg-black/20 w-7 h-7 rounded-full flex items-center justify-center transition"
                type="button"
              >
                ✕
              </button>
              <div className="inline-block bg-amber-500 text-saffron-950 font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider mb-1">
                Kashi Astro Hotline
              </div>
              <h3 className="text-base font-bold font-display">Book {settings.panditName || 'Shyam Guru ji'} Live Hotline</h3>
              <p className="text-[10px] text-saffron-100 mt-1">
                Establish a direct telephonic & custom WhatsApp pipeline for Astrological guidance.
              </p>
            </div>

            <form onSubmit={handleConsultSubmit} className="p-5 sm:p-6 space-y-4">
              
              {/* Review summary cards */}
              <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-100 grid grid-cols-2 gap-3 items-center">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Consultation Service</p>
                  <p className="font-bold text-saffron-900 text-xs mt-0.5">1-on-1 Phone & WhatsApp Consultation</p>
                  <p className="text-[10px] text-gray-500 italic mt-0.5">Duration: 24 Hours Unlimited Access</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-center">
                  <p className="text-[9px] text-amber-800 uppercase font-bold">Shradha Dakshina</p>
                  {previouslyPaidPandit ? (
                    <div>
                      <span className="text-[10px] text-gray-400 line-through mr-1">₹251</span>
                      <span className="text-sm font-extrabold text-saffron-700 font-display block">₹125</span>
                      <span className="inline-block text-[8px] text-orange-600 font-bold bg-orange-50 px-1 rounded-sm mt-0.5">50% Renewal!</span>
                    </div>
                  ) : (
                    <p className="text-lg font-extrabold text-saffron-700 font-display">₹251</p>
                  )}
                  <p className="text-[9.5px] text-green-600 font-medium">All taxes inclusive</p>
                </div>
              </div>

              {/* Input fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-semibold text-gray-600">Devotee Host Name</label>
                    <input 
                      type="text" 
                      required 
                      value={consultFormName}
                      onChange={(e) => setConsultFormName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full px-2.5 py-1.5 border border-gray-255 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 text-xs"
                      id="consult-field-name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-semibold text-gray-600">Primary Mobile (for voice callback)</label>
                    <input 
                      type="text" 
                      required 
                      value={consultFormPhone}
                      onChange={(e) => setConsultFormPhone(e.target.value)}
                      placeholder="eg. +91 98851 XXXXX"
                      className="w-full px-2.5 py-1.5 border border-gray-255 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 text-xs"
                      id="consult-field-phone"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10.5px] font-semibold text-gray-600">Vedic Gothra (Optional - for astral aligning)</label>
                  <input 
                    type="text"
                    value={consultFormGothra}
                    onChange={(e) => setConsultFormGothra(e.target.value)}
                    placeholder="eg. Bhardwaj, Kashyap, Shandilya"
                    className="w-full px-2.5 py-1.5 border border-gray-255 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 text-xs"
                    id="consult-field-gothra"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10.5px] font-semibold text-gray-600">Astrological Concern / Question (Optional)</label>
                  <textarea 
                    value={consultFormNotes}
                    onChange={(e) => setConsultFormNotes(e.target.value)}
                    placeholder="Describe your health, ancestral, corporate business, or matrimonial situations..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-gray-255 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 text-xs resize-none"
                    id="consult-field-notes"
                  />
                </div>
              </div>

              {/* Secure Payment System Selector */}
              <div className="space-y-2 border-t border-dashed border-gray-200 pt-3">
                <label className="block text-[10.5px] font-bold text-gray-700">Select Cosmic Transaction Channel</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConsultPayMethod('upi')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      consultPayMethod === 'upi'
                        ? 'border-saffron-500 bg-saffron-50/40 font-bold text-saffron-800'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <span className="text-sm font-display font-bold">📱 UPI Transfer</span>
                    <span className="text-[9px] opacity-75">PayTM, GPay, PhonePe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultPayMethod('card')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      consultPayMethod === 'card'
                        ? 'border-saffron-500 bg-saffron-50/40 font-bold text-saffron-800'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <span className="text-sm font-display font-bold">💳 Card Gateway</span>
                    <span className="text-[9px] opacity-75">Secure Visa, MasterCard</span>
                  </button>
                </div>
              </div>

              {/* UPI specific dynamic directions or checkout simulation */}
              {consultPayMethod === 'upi' ? (
                <div className="bg-gradient-to-b from-saffron-50/50 to-amber-50/50 p-3 rounded-xl border border-saffron-100 flex items-center gap-3 animate-fadeIn">
                  <div className="bg-white p-1 rounded-lg border border-amber-200 shrink-0 select-none">
                    <img 
                      src={settings.upiQrUrl || "https://images.unsplash.com/photo-1601597111158-2fceff270190?auto=format&fit=crop&q=80&w=150"} 
                      alt="Cosmic UPI QR"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-contain rounded-sm"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-[10px] text-saffron-850 uppercase tracking-wide block">Integrated UPI QR Gateway</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">UPI ID: <span className="font-mono text-gray-750 font-semibold">{settings.upiId || 'pooja4pandit@upi'}</span></p>
                    <p className="text-[9px] text-gray-400 italic">Secure merchant handshake simulated automatically on submit.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 bg-gray-50/50 p-3 rounded-xl border border-gray-150 animate-fadeIn text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-600 block uppercase">Visa Secure Checkout</span>
                    <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded-sm uppercase font-mono tracking-widest font-bold">PCI Compliant</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text" placeholder="Card Number" defaultValue="4111 2222 3333 4444" disabled
                      className="col-span-3 px-2 py-1.5 border border-gray-200 rounded-md bg-white text-gray-400 font-mono text-[10px]"
                    />
                    <input 
                      type="text" placeholder="MM/YY" defaultValue="12/28" disabled
                      className="px-2 py-1.5 border border-gray-200 rounded-md bg-white text-gray-400 font-mono text-[10px]"
                    />
                    <input 
                      type="password" placeholder="CVV" defaultValue="***" disabled
                      className="px-2 py-1.5 border border-gray-200 rounded-md bg-white text-gray-400 font-mono text-[10px]"
                    />
                    <span className="text-[9px] text-gray-400 italic flex items-center justify-end pr-1 font-sans">Simulated Secure</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConsultModalOpen(false)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold cursor-pointer transition flex-1 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-saffron-600 to-amber-500 hover:from-saffron-700 hover:to-amber-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs transition duration-150 cursor-pointer shadow-md uppercase tracking-wider flex-2 animate-bounce"
                  id="submit-consultation-btn"
                >
                  Confirm Dakshina & Bind Call (₹{previouslyPaidPandit ? 125 : 251})
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEVOTEE TERMS OF USE */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn" id="terms-modal-container">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6 border border-saffron-100 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-saffron-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h3 className="font-bold font-display text-lg text-saffron-950 uppercase tracking-wide">Devotee Terms & Conditions</h3>
              </div>
              <button 
                onClick={() => setIsTermsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 text-sm bg-gray-150 hover:bg-gray-250 rounded-full"
                type="button"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto py-4 text-xs text-gray-700 space-y-3 leading-relaxed pr-2 font-sans">
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-[11px] text-amber-900 font-medium mb-2">
                🕉️ These terms are dynamically configured by the Mathura-certified dynamic portal administration of {settings.panditName || 'Shyam Guru ji'}.
              </div>
              <p className="whitespace-pre-line font-sans text-xs text-gray-600 leading-relaxed">
                {settings.devoteeTerms || `1. Sanctity of Sankalpa: By scheduling a dynamic Vedic ritual on the devotee online portal, you agree that your designated Gotra, birth constellation, name, and lineage declarations are recorded with absolute accuracy to guarantee perfect resonance of Sanskrit phonetic swara metrics.
                
                2. Live Stream Attendance: To receive standard high-degree energetic outcomes, registered devotees should log in at least 10 minutes prior to the sacred calculated Muhurat seconds to assure flawless video link handshakes.
                 
                3. Materials Preparedness: In standard custom configurations, devotees are responsible for unboxing standard cow ghee and gangajal raw material cargos dispatched to their domestic threshold 3 days prior.
                
                4. Conduct & Respect: Appropriate cleanliness, modest attire, and an atmosphere of silence and spiritual devotion must be maintained inside your domestic space throughout the E-Puja interactive chants.`}
              </p>
            </div>
            
            <div className="border-t border-saffron-100 pt-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition duration-150 cursor-pointer shadow-md w-full"
              >
                Accept & Close Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERSISTENT FLOATING WHATSAPP ASSISTANCE ACCESSIBILITY BUTTON */}
      {settings.whatsappNumber && (
        <a
          href={`https://wa.me/${(settings.whatsappNumber || '+91 98851 10082').replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer"
          referrerPolicy="no-referrer"
          className="fixed bottom-6 left-6 z-40 bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition duration-200 hover:scale-105 active:scale-95 group border-2 border-white/20"
          id="floating-whatsapp-widget"
          title="Direct WhatsApp Guidance Support"
        >
          <span className="relative flex h-3 w-3 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.012 2c-5.518 0-9.99 4.493-9.99 10.011 0 1.905.534 3.689 1.458 5.215L2 22l5.006-1.312a9.92 9.92 0 0 0 5.006 1.323c5.524 0 10.007-4.498 10.007-10.011C22.02 6.493 17.536 2 12.012 2zm6.277 14.167c-.244.693-1.42 1.258-1.954 1.332-.533.074-1.071.139-3.238-.727a11.164 11.164 0 0 1-4.857-4.28 12.57 12.57 0 0 1-1.354-2.88c-.068-.382.261-.598.544-.614.195-.011.393.003.553.013.16.01.244.02.348.243.141.315.485 1.189.527 1.277.043.087.054.212.003.327-.052.115-.173.228-.277.348-.103.118-.217.204-.092.423.479.82 1.107 1.5 1.865 2.016.59.397 1.096.554 1.353.428.16-.08.318-.282.434-.447.168-.239.3-.185.505-.104.205.08 1.302.613 1.524.726.223.115.348.195.402.293.054.098.054.554-.19 1.247z" />
          </svg>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap text-xs font-bold font-sans ml-2">
            Pooja WhatsApp Guidance Support
          </span>
        </a>
      )}

    </div>
  );
}
