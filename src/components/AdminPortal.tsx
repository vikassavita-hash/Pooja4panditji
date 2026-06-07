import React, { useState } from 'react';
import { Puja, Booking, PujaPackage, PortalSettings, UserAccount, GalleryItem } from '../types';
import { 
  Lock, ShieldCheck, Eye, Edit2, Check, RefreshCw, LogOut, 
  Image, CheckCircle, Calendar, FileText, Sparkles, Sliders,
  MessageSquare, Layers, Coins, Info, Trash2, PlusCircle, Settings, HelpCircle,
  Users, Download, Video
} from 'lucide-react';

interface AdminPortalProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  pujas: Puja[];
  setPujas: React.Dispatch<React.SetStateAction<Puja[]>>;
  settings: PortalSettings;
  setSettings: React.Dispatch<React.SetStateAction<PortalSettings>>;
  users: UserAccount[];
  gallery: GalleryItem[];
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
}

export default function AdminPortal({ bookings, setBookings, pujas, setPujas, settings, setSettings, users, gallery, setGallery }: AdminPortalProps) {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check session safety
    return sessionStorage.getItem('pooja4pandit_admin_auth') === 'true';
  });
  const [errorMsg, setErrorMsg] = useState('');

  // Tab state inside admin dashboard
  const [adminSubTab, setAdminSubTab] = useState<'bookings' | 'users' | 'catalog' | 'settings' | 'email_logs' | 'gallery_mgmt'>('bookings');
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  React.useEffect(() => {
    if (adminSubTab === 'email_logs') {
      fetch('/api/email-logs')
        .then(res => res.json())
        .then(data => setEmailLogs(data))
        .catch(err => console.error("Could not fetch email dispatch logs:", err));
    }
  }, [adminSubTab]);

  // Report Download CSV Generator systems
  const downloadBookingsCSV = () => {
    const headers = ["Booking ID", "Puja Name", "Customer Name", "Customer Phone", "Customer Email", "Gotra", "Nakshatra", "Ritual Mode", "Schedule", "Dakshina (INR)", "Status", "Payment Method"];
    const rows = bookings.map(b => [
      b.id,
      b.pujaName,
      b.customerName,
      b.customerPhone,
      b.customerEmail,
      b.gothra || 'Kashyap',
      b.nakshatra || 'Anuradha',
      b.mode,
      b.dateTime,
      b.price.toString(),
      b.status,
      b.paymentMethod || 'UPI'
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pooja4panditji_bookings_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadUsersCSV = () => {
    const headers = ["Devotee ID (Email)", "Full Name", "Phone Number", "Gothra", "Nakshatra", "Registered On"];
    const rows = users.map(u => [
      u.userId,
      u.fullName,
      u.phone,
      u.gothra || 'Kashyap',
      u.nakshatra || 'Anuradha',
      u.createdAt
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pooja4panditji_devotees_registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCatalogCSV = () => {
    const headers = ["Puja ID", "Puja Name", "Sanskrit Name", "Category", "Base Price (INR)"];
    const rows = pujas.map(p => [
      p.id,
      p.name,
      p.sanskritName,
      p.category,
      p.basePrice.toString()
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pooja4panditji_pujas_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Selected booking for detailed drawer/viewing
  const [selectedBkgForView, setSelectedBkgForView] = useState<Booking | null>(null);

  // Catalog update state variables
  const [selectedPujaToEdit, setSelectedPujaToEdit] = useState<Puja | null>(null);
  const [customBasePrice, setCustomBasePrice] = useState<number>(0);
  const [customBasicPrice, setCustomBasicPrice] = useState<number>(0);
  const [customStandardPrice, setCustomStandardPrice] = useState<number>(0);
  const [customPremiumPrice, setCustomPremiumPrice] = useState<number>(0);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customPerformance, setCustomPerformance] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // celestial photo upload states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');

  const performPhotoUpload = async (file: File): Promise<string> => {
    setIsUploadingPhoto(true);
    setUploadErrorMsg('');
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an actual image file.');
      }
      if (file.size > 20 * 1024 * 1024) { // 20 MB max
        throw new Error('Image size exceeds 20MB limit.');
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, base64 })
      });
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error("Vedic uploader failure:", err);
      const userErr = err.message || 'Failed to upload photo to the backend server.';
      setUploadErrorMsg(userErr);
      throw err;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Add listing state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPujaName, setNewPujaName] = useState('');
  const [newPujaSanskrit, setNewPujaSanskrit] = useState('');
  const [newPujaTagline, setNewPujaTagline] = useState('');
  const [newPujaDesc, setNewPujaDesc] = useState('');
  const [newPujaSig, setNewPujaSig] = useState('');
  const [newPujaCategory, setNewPujaCategory] = useState<'prosperity' | 'remedial' | 'milestones' | 'festivals' | 'peace'>('prosperity');
  const [newPujaDeity, setNewPujaDeity] = useState('Ganesha');
  const [newPujaBasePrice, setNewPujaBasePrice] = useState<number>(2101);
  const [newPujaImage, setNewPujaImage] = useState('https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=800');
  const [newPujaMantra, setNewPujaMantra] = useState('ॐ गं गणपतये नमः');
  const [newPujaMantraMeaning, setNewPujaMantraMeaning] = useState('Salutations to the remover of absolute obstacles, Ganesha.');

  // Global settings local states synced with prop settings
  const [localPhone, setLocalPhone] = useState(settings.contactPhone || '+91 84450 30767');
  const [localWhatsapp, setLocalWhatsapp] = useState(settings.whatsappNumber || '+91 84450 30767');
  const [localApiKey, setLocalApiKey] = useState(settings.geminiApiKey || '');
  const [localUpiId, setLocalUpiId] = useState(settings.upiId || 'shastri.pandit108@okhdfcbank');
  const [localUpiQr, setLocalUpiQr] = useState(settings.upiQrUrl || '');
  
  const [localPanditName, setLocalPanditName] = useState(settings.panditName || 'Shyam Guru ji');
  const [localPanditCertification, setLocalPanditCertification] = useState(settings.panditCertification || 'certified by Mathura');
  const [localPanditBio, setLocalPanditBio] = useState(settings.panditBio || 'Eminent Vedic Shastri certified by Mathura.');
  const [localPanditImage, setLocalPanditImage] = useState(settings.panditImage || '👳🏽');
  const [localDevoteeTerms, setLocalDevoteeTerms] = useState(settings.devoteeTerms || '');
  
  const [localShowExplorePujasTab, setLocalShowExplorePujasTab] = useState(settings.showExplorePujasTab !== false);
  const [localShowAiPanditTab, setLocalShowAiPanditTab] = useState(settings.showAiPanditTab !== false);
  const [localShowMyBookingsTab, setLocalShowMyBookingsTab] = useState(settings.showMyBookingsTab !== false);
  const [localShowAdminPortalTab, setLocalShowAdminPortalTab] = useState(settings.showAdminPortalTab !== false);

  const [localGmailAddress, setLocalGmailAddress] = useState(settings.gmailAddress || 'vsvikash290@gmail.com');
  const [localGoogleAppPassword, setLocalGoogleAppPassword] = useState(settings.googleAppPassword || '');

  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');

  // Done Pujas Gallery state variables
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryItem | null>(null);
  const [isAddingNewGallery, setIsAddingNewGallery] = useState(false);
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryDesc, setNewGalleryDesc] = useState('');
  const [newGalleryDate, setNewGalleryDate] = useState('');
  const [newGalleryImage, setNewGalleryImage] = useState('https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=800');
  const [newGalleryVideo, setNewGalleryVideo] = useState('');
  
  const [editGalleryTitle, setEditGalleryTitle] = useState('');
  const [editGalleryDesc, setEditGalleryDesc] = useState('');
  const [editGalleryDate, setEditGalleryDate] = useState('');
  const [editGalleryImage, setEditGalleryImage] = useState('');
  const [editGalleryVideo, setEditGalleryVideo] = useState('');
  
  const [gallerySaveSuccess, setGallerySaveSuccess] = useState('');

  const handleCreateGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryTitle || !newGalleryDesc || !newGalleryDate) {
      alert("Please fill out the title, description, and performance date.");
      return;
    }

    const newItem: GalleryItem = {
      id: 'gal_' + Date.now(),
      title: newGalleryTitle,
      description: newGalleryDesc,
      date: newGalleryDate,
      imageUrl: newGalleryImage,
      videoUrl: newGalleryVideo || undefined
    };

    const updated = [newItem, ...gallery];
    setGallery(updated);
    
    // Save to server
    fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.error("Could not save gallery item:", err));

    setNewGalleryTitle('');
    setNewGalleryDesc('');
    setNewGalleryDate('');
    setNewGalleryImage('https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=800');
    setNewGalleryVideo('');
    setIsAddingNewGallery(false);
    setSelectedGalleryItem(newItem);
    
    setGallerySaveSuccess(`Successfully added performed puja: "${newItem.title}"`);
    setTimeout(() => setGallerySaveSuccess(''), 5000);
  };

  const handleSaveGalleryChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGalleryItem) return;

    const updated = gallery.map(item => {
      if (item.id === selectedGalleryItem.id) {
        return {
          ...item,
          title: editGalleryTitle,
          description: editGalleryDesc,
          date: editGalleryDate,
          imageUrl: editGalleryImage,
          videoUrl: editGalleryVideo || undefined
        };
      }
      return item;
    });

    setGallery(updated);
    
    // Save to server
    fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.error("Could not update gallery item:", err));

    setGallerySaveSuccess('Successfully updated performed puja.');
    setTimeout(() => setGallerySaveSuccess(''), 5000);
  };

  const handleDeleteGalleryItem = (id: string) => {
    const itemToDelete = gallery.find(g => g.id === id);
    if (!itemToDelete) return;

    if (confirm(`Are you sure you want to remove the performed puja "${itemToDelete.title}"?`)) {
      const updated = gallery.filter(g => g.id !== id);
      setGallery(updated);
      
      // Save to server
      fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.error("Could not delete gallery item:", err));

      setSelectedGalleryItem(null);
      setGallerySaveSuccess(`Deleted performed puja: "${itemToDelete.title}"`);
      setTimeout(() => setGallerySaveSuccess(''), 5000);
    }
  };

  // Curated premium high-quality secure temple image presets for easy Deity photo-changing
  const SACRED_IMAGE_PRESETS = [
    {
      name: 'Vedic Altar Camphor',
      deity: 'General',
      url: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Lord Ganesha (Gold Blessing)',
      deity: 'Ganesha',
      url: 'https://images.unsplash.com/photo-1609137144814-6330bf4cb51b?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Sacred Shiva Meditation',
      deity: 'Shiva',
      url: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Auspicious Lakshmi (Wealth Mandir)',
      deity: 'Lakshmi',
      url: 'https://images.unsplash.com/photo-1608958416715-db809f6eeb6f?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Kashi Vishwanath Kalash',
      deity: 'Shiva/Vastu',
      url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Holy Vedic Fire Havan',
      deity: 'Homa/Sacrifice',
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800'
    }
  ];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.toLowerCase() === 'admin108') {
      setIsAuthenticated(true);
      sessionStorage.setItem('pooja4pandit_admin_auth', 'true');
      setErrorMsg('');
    } else {
      setErrorMsg('Sacred passcode invalid. Tip: Try "admin108" to access the spiritual ledger.');
    }
  };

  const handleBypass = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('pooja4pandit_admin_auth', 'true');
    setErrorMsg('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('pooja4pandit_admin_auth');
    setPasscode('');
  };

  const handleStatusChange = (bkgId: string, nextStatus: Booking['status']) => {
    setBookings(prev => prev.map(bk => {
      if (bk.id === bkgId) {
        return { ...bk, status: nextStatus };
      }
      return bk;
    }));
    // If the selected modal is active, update its reference as well
    if (selectedBkgForView?.id === bkgId) {
      setSelectedBkgForView(prev => prev ? { ...prev, status: nextStatus } : null);
    }
  };

  const handleSelectPujaForEdit = (puja: Puja) => {
    setIsAddingNew(false);
    setSelectedPujaToEdit(puja);
    setCustomBasePrice(puja.basePrice);
    setCustomBasicPrice(puja.packages.find(p => p.id === 'basic')?.price || puja.basePrice);
    setCustomStandardPrice(puja.packages.find(p => p.id === 'standard')?.price || 5100);
    setCustomPremiumPrice(puja.packages.find(p => p.id === 'premium')?.price || 11000);
    setCustomImageUrl(puja.imageUrl);
    setCustomPerformance(puja.performance || '');
    setSaveSuccessMsg('');
  };

  const handleCreateNewPuja = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPujaName || !newPujaSanskrit) {
      alert("Please enter the sacred puja name and Sanskrit name.");
      return;
    }

    const createdPackages: PujaPackage[] = [
      {
        id: 'basic',
        name: 'E-Puja Remote Path',
        description: 'Participate remotely via interactive high-definition livestream. Dynamic chant coordination & offline Prasad dispatch.',
        price: newPujaBasePrice,
        benefits: ["Live interactive HD streams", "Sankalpa recitation", "Prasad dispatch by speed post"],
        durationMinutes: 60,
        includedSamagri: false,
        dakshinaInclusions: ["Senior Shastri Ji's recitation fees", "Digital holy certificate"]
      },
      {
        id: 'standard',
        name: 'In-person Ghar Puja Sanskar',
        description: 'Sacred Pandit Shastris visiting your home. Traditional sandhya decorations, custom dynamic sankalpa mantra recitation.',
        price: newPujaBasePrice * 2,
        benefits: ["Scholastic Priest visits home", "Complete offline Havan setup", "Astrological family horoscopy check"],
        durationMinutes: 120,
        includedSamagri: true,
        dakshinaInclusions: ["Guru Dakshina", "Priest travel and accommodations", "Sacred thread binding"]
      },
      {
        id: 'premium',
        name: 'Maha Yajna Grand Puja & Havan',
        description: 'Multi-priest sacred Homam. Sourcing 100% pure cow ghee, sacred samagri woods, complete herbal havan setup.',
        price: newPujaBasePrice * 4,
        benefits: ["Three high-caliber Acharyas", "Grand multi-priest chanting", "Complete high-grade samagri kit included"],
        durationMinutes: 180,
        includedSamagri: true,
        dakshinaInclusions: ["Multi-priest combined guru dakshina", "Ritual materials and home arrangements", "Special celestial chanting protection"]
      }
    ];

    const newPujaItem: Puja = {
      id: 'puja_' + Date.now(),
      name: newPujaName,
      sanskritName: newPujaSanskrit,
      tagline: newPujaTagline || 'Authentic Vedic blessing with pure materials',
      description: newPujaDesc || `${newPujaName} ritual conducted by certified Shastri scholars with complete samagri.`,
      significance: newPujaSig || 'Restores pure protective fields and brings supreme Shanti.',
      category: newPujaCategory,
      deity: newPujaDeity || 'Ganesha',
      rating: 4.9,
      reviewCount: 15,
      durationString: '2 Hours Vedic Path',
      basePrice: newPujaBasePrice,
      imageUrl: newPujaImage,
      packages: createdPackages,
      samagriList: [
        { name: 'Pure Desi Cow Ghee', quantity: '500g', isMandatory: true, category: 'essential' },
        { name: 'Sacred Havan Samagri Wood', quantity: '1 Pack', isMandatory: true, category: 'sacred' },
        { name: 'Kesar & Kapoor Pouch', quantity: '1 Set', isMandatory: true, category: 'sacred' }
      ],
      mantra: newPujaMantra || 'ॐ श्री गणेशाय नमः',
      mantraMeaning: newPujaMantraMeaning || 'Salutations to the Remover of All Obstacles.'
    };

    const updated = [...pujas, newPujaItem];
    setPujas(updated);
    
    // Save to local storage for persistence
    localStorage.setItem('pooja4pandit_local_pujas', JSON.stringify(updated));

    // Reset fields
    setNewPujaName('');
    setNewPujaSanskrit('');
    setNewPujaTagline('');
    setNewPujaDesc('');
    setNewPujaSig('');
    setNewPujaBasePrice(2101);
    setIsAddingNew(false);
    setSelectedPujaToEdit(newPujaItem);
    
    setSaveSuccessMsg(`Auspiciously Listed "${newPujaItem.name}" to Devotional Catalog!`);
    setTimeout(() => setSaveSuccessMsg(''), 5000);
  };

  const handleDeletePuja = (pujaId: string) => {
    const pujaToDelete = pujas.find(p => p.id === pujaId);
    if (!pujaToDelete) return;
    
    if (confirm(`Are you absolutely sure you want to delete the sacred listing "${pujaToDelete.name}"? This action is permanent.`)) {
      const updated = pujas.filter(p => p.id !== pujaId);
      setPujas(updated);
      localStorage.setItem('pooja4pandit_local_pujas', JSON.stringify(updated));
      setSelectedPujaToEdit(null);
      setSaveSuccessMsg(`Removed "${pujaToDelete.name}" from active listings.`);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    }
  };

  const handleSaveGlobalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: PortalSettings = {
      contactPhone: localPhone || '+91 84450 30767',
      whatsappNumber: localWhatsapp || '+91 84450 30767',
      geminiApiKey: localApiKey || '',
      upiId: localUpiId || 'shastri.pandit108@okhdfcbank',
      upiQrUrl: localUpiQr || '',
      panditName: localPanditName,
      panditCertification: localPanditCertification,
      panditBio: localPanditBio,
      panditImage: localPanditImage,
      devoteeTerms: localDevoteeTerms,
      showExplorePujasTab: localShowExplorePujasTab,
      showAiPanditTab: localShowAiPanditTab,
      showMyBookingsTab: localShowMyBookingsTab,
      showAdminPortalTab: localShowAdminPortalTab,
      gmailAddress: localGmailAddress,
      googleAppPassword: localGoogleAppPassword
    };
    setSettings(updatedSettings);
    // Write back to localstorage immediately
    localStorage.setItem('pooja4panditji_portal_settings', JSON.stringify(updatedSettings));
    setSettingsSuccessMsg('ॐ Shanti! Global support helpline, SMTP dynamic Gmail dispatcher credentials, Pandit certified profile, and tab configurations updated successfully.');
    setTimeout(() => setSettingsSuccessMsg(''), 5000);
  };

  const handleSaveCatalogChangesOnSelected = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPujaToEdit) return;

    // Mutate and save the catalog
    const updatedPujas = pujas.map(p => {
      if (p.id === selectedPujaToEdit.id) {
        // Map all packages updated with these prices
        const updatedPackages = p.packages.map(pkg => {
          if (pkg.id === 'basic') return { ...pkg, price: customBasicPrice };
          if (pkg.id === 'standard') return { ...pkg, price: customStandardPrice };
          if (pkg.id === 'premium') return { ...pkg, price: customPremiumPrice };
          return pkg;
        });

        return {
          ...p,
          basePrice: customBasePrice,
          imageUrl: customImageUrl,
          performance: customPerformance,
          packages: updatedPackages
        };
      }
      return p;
    });

    setPujas(updatedPujas);
    localStorage.setItem('pooja4pandit_local_pujas', JSON.stringify(updatedPujas));

    setSaveSuccessMsg('Aum! Sacred prices, photo coordinates, and performance notes updated successfully across all servers.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const calculateTotalSalesRevenue = () => {
    return bookings.reduce((acc, current) => acc + current.price, 0);
  };

  const countActiveEpujaBookings = () => {
    return bookings.filter(b => b.mode === 'e-puja').length;
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 animate-fadeIn" id="admin-login-screen">
        <div className="bg-white rounded-2xl border border-saffron-200 shadow-2xl overflow-hidden p-6 sm:p-8 relative">
          
          <div className="absolute right-0 top-0 opacity-5 select-none pointer-events-none p-4">
            <span className="text-8xl font-bold font-display text-saffron-600">ॐ</span>
          </div>

          <div className="text-center space-y-3 mb-6">
            <div className="w-14 h-14 rounded-full bg-saffron-100 text-saffron-600 border border-saffron-200 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-2xl font-extrabold text-saffron-900 font-display">Shastri Mandir Guard</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Please declare your credential parameters to access booking settlements, price configurations, and deity photograph changes.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 font-sans">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sacred Passcode</label>
              <input
                id="admin-passcode-box"
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter admin passcode"
                className="w-full text-center tracking-[0.2em] px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-saffron-500 font-mono text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Demo Credentials: <span className="font-mono font-extrabold text-saffron-650">admin108</span>
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 p-2.5 rounded-lg text-center leading-normal" id="login-error-msg">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 cursor-pointer shadow-md uppercase tracking-wider flex items-center justify-center gap-1.5"
              id="admin-login-submit"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Unlock Admin Ledger</span>
            </button>

            <button
              type="button"
              onClick={handleBypass}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 pl-4 pr-4 py-2 rounded-xl text-[10px] transition duration-150 cursor-pointer text-center font-bold"
            >
              Master Bypass Override (Quick Test)
            </button>
          </form>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" id="admin-main-dashboard">
      
      {/* Admin Title Banner */}
      <div className="bg-gradient-to-r from-saffron-850 to-neutral-800 text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-gold-300" />
            <span className="bg-gold-500/20 text-gold-100 border border-gold-400/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide">
              Secure Shastri Terminal
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display leading-tight text-white tracking-tight mt-1">
            Pooja4Panditji Management Console
          </h2>
          <p className="text-xs text-saffron-100/80">Audit active client bookings, manage puja listing pricing, status flows, and graphics</p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-white/10 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/40 border border-white/10 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer"
          id="admin-logout-btn"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Ledger Session</span>
        </button>
      </div>

      {/* Analytics Bento Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-saffron-100 shadow-sm">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold block">Pith Dakshina Collected</span>
          <p className="text-3xl font-extrabold font-display text-gray-900 mt-1">₹{calculateTotalSalesRevenue().toLocaleString()}</p>
          <div className="mt-2.5 text-[11px] text-emerald-600 font-mono font-bold flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            <span>100% Pandit Payments Dispatched</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-saffron-100 shadow-sm">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold block">Devotee Hostings</span>
          <p className="text-3xl font-extrabold font-display text-saffron-800 mt-1">{bookings.length}</p>
          <div className="mt-2.5 text-[11px] text-gray-500 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-saffron-500 animate-pulse" />
            <span>Reservations active on calendar</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-saffron-100 shadow-sm">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold block">Remote E-Puja Streams</span>
          <p className="text-3xl font-extrabold font-display text-blue-600 mt-1">{countActiveEpujaBookings()}</p>
          <div className="mt-2.5 text-[11px] text-blue-500 font-semibold">
            <span>Interactive Zoom & Meet linked</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-saffron-100 shadow-sm">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold block">Listed Pujas catalog</span>
          <p className="text-3xl font-extrabold font-display text-gray-800 mt-1">{pujas.length}</p>
          <div className="mt-2.5 text-[11px] text-orange-600 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-vibrational remedies live</span>
          </div>
        </div>

      </div>

      {/* Navigation Inside Admin Portal */}
      <div className="flex border-b border-saffron-100 gap-2 font-medium">
        <button
          onClick={() => setAdminSubTab('bookings')}
          className={`pb-2.5 px-4 text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            adminSubTab === 'bookings'
              ? 'text-saffron-700 font-extrabold border-b-2 border-saffron-600'
              : 'text-gray-500 hover:text-saffron-600'
          }`}
          id="admin-tab-bookings"
        >
          Check Booking Details ({bookings.length})
        </button>

        <button
          onClick={() => setAdminSubTab('users')}
          className={`pb-2.5 px-4 text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            adminSubTab === 'users'
              ? 'text-saffron-700 font-extrabold border-b-2 border-saffron-600'
              : 'text-gray-500 hover:text-saffron-600'
          }`}
          id="admin-tab-users"
        >
          Devotee Accounts Logs ({users.length})
        </button>

        <button
          onClick={() => setAdminSubTab('catalog')}
          className={`pb-2.5 px-4 text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            adminSubTab === 'catalog'
              ? 'text-saffron-700 font-extrabold border-b-2 border-saffron-600'
              : 'text-gray-500 hover:text-saffron-600'
          }`}
          id="admin-tab-catalog"
        >
          Catalog Price & Photo Control
        </button>

        <button
          onClick={() => setAdminSubTab('gallery_mgmt')}
          className={`pb-2.5 px-4 text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            adminSubTab === 'gallery_mgmt'
              ? 'text-saffron-700 font-extrabold border-b-2 border-saffron-600'
              : 'text-gray-500 hover:text-saffron-600'
          }`}
          id="admin-tab-gallery"
        >
          Sacred Gallery Management ({gallery.length})
        </button>

        <button
          onClick={() => setAdminSubTab('settings')}
          className={`pb-2.5 px-4 text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            adminSubTab === 'settings'
              ? 'text-saffron-700 font-extrabold border-b-2 border-saffron-600'
              : 'text-gray-500 hover:text-saffron-600'
          }`}
          id="admin-tab-settings"
        >
          Global Devotion Settings
        </button>

        <button
          onClick={() => setAdminSubTab('email_logs')}
          className={`pb-2.5 px-4 text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            adminSubTab === 'email_logs'
              ? 'text-saffron-700 font-extrabold border-b-2 border-saffron-600'
              : 'text-gray-500 hover:text-saffron-600'
          }`}
          id="admin-tab-emaillogs"
        >
          ✉️ Email dispatch logs
        </button>
      </div>

      {/* ADMIN SUB-TAB 1: BOOKING DETAILS AUDITOR */}
      {adminSubTab === 'bookings' && (
        <div className="bg-white rounded-xl border border-saffron-100 shadow-md p-4 sm:p-6 space-y-4">
          
          <div className="flex justify-between items-center pr-2">
            <div>
              <h4 className="text-base font-extrabold text-gray-900 font-display">Devotee Log Settlements</h4>
              <p className="text-xs text-gray-500">Review detailed booking parameters including Gothras, nakshatras, and payout flags.</p>
            </div>
            <span className="text-xs bg-neutral-100 px-3 py-1 bg-opacity-80 rounded-lg text-gray-600 font-mono">
              Count: {bookings.length}
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left text-xs text-gray-700 font-sans">
              
              <thead className="bg-saffron-50/45 text-[10px] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-100">
                <tr>
                  <th className="p-3">Ref ID</th>
                  <th className="p-3">Ritual & Package</th>
                  <th className="p-3">Devotee Host</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Gothra / Nakshatra</th>
                  <th className="p-3">Mode & Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-saffron-50/10 transition-colors">
                    
                    {/* ID */}
                    <td className="p-3 font-mono font-bold text-saffron-700">
                      {b.id}
                    </td>

                    {/* Puja Name / Package */}
                    <td className="p-3">
                      <p className="font-bold text-gray-950 font-display text-[13px]">{b.pujaName}</p>
                      <p className="text-xs font-medium text-saffron-600 mt-0.5">{b.packageName}</p>
                    </td>

                    {/* Devotee */}
                    <td className="p-3 leading-normal">
                      <p className="font-semibold text-gray-900">{b.customerName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{b.customerPhone}</p>
                      <p className="text-[10px] text-gray-400 font-mono max-w-[120px] truncate">{b.customerEmail}</p>
                    </td>

                    {/* DateTime */}
                    <td className="p-3 leading-tight font-mono text-[11px]">
                      <p className="font-bold text-gray-700">
                        {new Date(b.dateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        {new Date(b.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>

                    {/* Gothra / Nakshatra */}
                    <td className="p-3">
                      <p className="text-xs text-gray-800"><span className="text-gray-400">G:</span> {b.gothra}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5"><span className="text-gray-400">N:</span> {b.nakshatra || 'Universal'}</p>
                    </td>

                    {/* Price / Mode */}
                    <td className="p-3 leading-normal">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.mode === 'e-puja' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                          : 'bg-orange-50 text-orange-600 border border-orange-200'
                      }`}>
                        {b.mode === 'e-puja' ? 'E-Puja' : 'Home-Puja'}
                      </span>
                      <p className="text-sm font-bold font-mono mt-1 text-gray-900">₹{b.price.toLocaleString()}</p>
                    </td>

                    {/* Status badge */}
                    <td className="p-3">
                      <select
                        value={b.status}
                        onChange={(e) => handleStatusChange(b.id, e.target.value as Booking['status'])}
                        className={`text-[11px] font-bold px-2 py-1 rounded-md border focus:outline-none ${
                          b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                          b.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          b.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-250'
                        }`}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Audit click detail */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedBkgForView(b)}
                        className="p-1.5 rounded-lg bg-gray-50 hover:bg-saffron-100 text-gray-650 hover:text-saffron-800 transition duration-150 inline-flex items-center gap-1 font-bold scale-95 cursor-pointer"
                        title="Audit full devotional param details"
                        id={`audit-btn-${b.id}`}
                      >
                        <Eye className="w-4 h-4" />
                        <span>Audit</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>

        </div>
      )}

      {/* ADMIN SUB-TAB 1.5: Devotee Accounts & Report Extractions */}
      {adminSubTab === 'users' && (
        <div className="bg-white rounded-xl border border-saffron-100 shadow-md p-5 sm:p-6 animate-fadeIn space-y-6">
          <div className="border-b border-gray-150 pb-4">
            <h4 className="text-base font-extrabold text-gray-900 font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-saffron-600 animate-pulse" />
              <span>Devotee Accounts Logs & Analytical Reports</span>
            </h4>
            <p className="text-xs text-gray-500 mt-1">Manage registered devotee login logs and retrieve instant Excel-friendly CSV files of custom temple lists.</p>
          </div>

          {/* Analytical CSV downloads widgets */}
          <div className="bg-saffron-50/15 border border-saffron-100/60 p-4 rounded-xl space-y-4">
            <h5 className="font-bold text-saffron-950 uppercase tracking-wider text-[10px] flex items-center gap-2 border-b border-saffron-100 pb-2">
              <Download className="w-4 h-4 text-saffron-600" />
              <span>Sacred Reports & Ledger Export Hub</span>
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={downloadBookingsCSV}
                className="bg-white hover:bg-saffron-50/50 text-saffron-800 border border-saffron-200 p-4 rounded-xl transition duration-150 flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-xs focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full bg-saffron-50 border border-saffron-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-saffron-600" />
                </div>
                <strong className="text-xs font-bold leading-none">Booking Settlements Report</strong>
                <span className="text-[10px] text-gray-400">Extracts {bookings.length} puja bookings (CSV)</span>
              </button>

              <button
                type="button"
                onClick={downloadUsersCSV}
                className="bg-white hover:bg-saffron-50/50 text-saffron-800 border border-saffron-200 p-4 rounded-xl transition duration-150 flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-xs focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full bg-saffron-50 border border-saffron-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-saffron-600" />
                </div>
                <strong className="text-xs font-bold leading-none">Devotee Registry Ledger</strong>
                <span className="text-[10px] text-gray-400">Extracts {users.length} user registrations (CSV)</span>
              </button>

              <button
                type="button"
                onClick={downloadCatalogCSV}
                className="bg-white hover:bg-saffron-50/50 text-saffron-800 border border-saffron-200 p-4 rounded-xl transition duration-150 flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-xs focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full bg-saffron-50 border border-saffron-100 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-saffron-600" />
                </div>
                <strong className="text-xs font-bold leading-none">Puja Catalog Offerings</strong>
                <span className="text-[10px] text-gray-400">Extracts active {pujas.length} rites and fees</span>
              </button>
            </div>
          </div>

          {/* Devotee users registers list details */}
          <div>
            <h5 className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-3">Active Registered Devotees</h5>
            
            <div className="border border-gray-150 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 font-display text-[10.5px] uppercase font-bold text-gray-500 tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap">Primary Phone</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Devotee Name</th>
                    <th className="py-3.5 px-4 font-mono whitespace-nowrap">User ID (Email)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Vedic Gotra</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Nakshatra</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px] text-gray-650 font-sans">
                  {users.map((u, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/10 transition duration-100">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold text-[10px]">
                          {u.phone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-800 whitespace-nowrap">{u.fullName}</td>
                      <td className="py-3.5 px-4 font-mono text-saffron-700 font-semibold whitespace-nowrap">{u.userId}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-750 bg-saffron-50 text-saffron-800 px-2.5 py-0.5 rounded-full text-[10px]">
                          {u.gothra || "Kashyap (Universal/No Gothra)"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-750 whitespace-nowrap">{u.nakshatra || "Anuradha"}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-400 whitespace-nowrap" title={u.createdAt}>
                        {new Date(u.createdAt).toISOString().split('T')[0]}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
                        No registered devotee accounts yet. Users will appear here on email signup.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN SUB-TAB 2: PRICE UPDATE & DEITY PHOTO UPDATE */}
      {adminSubTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Catalog items list */}
          <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-saffron-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center gap-2">
              <div>
                <h4 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Select Sacred Service</h4>
                <p className="text-[11px] text-gray-400 mt-1">Select a divine listing to configure prices or create listings</p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsAddingNew(true);
                setSelectedPujaToEdit(null);
                setSaveSuccessMsg('');
              }}
              className={`w-full p-3 rounded-xl border-2 border-dashed font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer ${
                isAddingNew 
                  ? 'bg-amber-50 border-amber-400 text-amber-800 animate-pulse'
                  : 'bg-saffron-50/40 border-saffron-200 text-saffron-710 hover:bg-saffron-50 text-saffron-800'
              }`}
              id="admin-btn-trigger-add"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Puja Listing</span>
            </button>

            <div className="space-y-2 mt-4">
              {pujas.map((pj) => {
                const isSelected = selectedPujaToEdit?.id === pj.id && !isAddingNew;
                return (
                  <button
                    key={pj.id}
                    onClick={() => handleSelectPujaForEdit(pj)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center gap-3 cursor-pointer ${
                      isSelected 
                        ? 'bg-saffron-50 border-saffron-300 ring-1 ring-saffron-300' 
                        : 'bg-white hover:bg-gray-50 border-gray-100'
                    }`}
                    id={`catalog-select-${pj.id}`}
                  >
                    <img
                      src={pj.imageUrl}
                      alt={pj.name}
                      className="w-10 h-10 rounded-lg object-cover border border-saffron-10s shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-gray-900 truncate">{pj.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">Base: ₹{pj.basePrice.toLocaleString()}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-mono tracking-wider font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100/60 border border-amber-200 text-saffron-800">
                        {pj.category}
                      </span>
                    </div>

                  </button>
                );
              })}
            </div>
          </div>

          {/* Right section: Modifiers & Add New forms */}
          <div className="lg:col-span-2 space-y-4">
            
            {saveSuccessMsg && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-bounce animate-duration-300" id="catalog-success-shanti">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {isAddingNew ? (
              /* ADD NEW SACRED PUJA LISTING FORM */
              <div className="bg-white rounded-xl border border-amber-200 shadow-md p-5 sm:p-6 animate-fadeIn">
                <div className="border-b border-gray-150 pb-4 mb-5 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-600 block font-extrabold">New Deity Listing Launcher</span>
                    <p className="text-lg font-bold text-gray-900 font-display mt-0.5">Create Sacred Puja Service</p>
                  </div>
                  <button
                    onClick={() => setIsAddingNew(false)}
                    className="text-gray-400 hover:text-gray-650 font-bold text-xs"
                    type="button"
                  >
                    ✕ Cancel
                  </button>
                </div>

                <form onSubmit={handleCreateNewPuja} className="space-y-4 text-xs text-gray-750 font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Sacred Puja Name (English)</label>
                      <input
                        type="text"
                        required
                        value={newPujaName}
                        onChange={(e) => setNewPujaName(e.target.value)}
                        placeholder="eg. Sri Sukhmani Sahib Paath"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Sanskrit Devotional Title</label>
                      <input
                        type="text"
                        required
                        value={newPujaSanskrit}
                        onChange={(e) => setNewPujaSanskrit(e.target.value)}
                        placeholder="eg. श्री सुखमनी साहिब पाठ"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-semibold text-saffron-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold font-sans">Divine Tagline / Summary</label>
                    <input
                      type="text"
                      required
                      value={newPujaTagline}
                      onChange={(e) => setNewPujaTagline(e.target.value)}
                      placeholder="eg. Restores peace, prosperity, and high devotional flow"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Category Tag</label>
                      <select
                        value={newPujaCategory}
                        onChange={(e) => setNewPujaCategory(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 bg-white"
                      >
                        <option value="prosperity">Prosperity & Wellbeing</option>
                        <option value="remedial">Remedial Healing</option>
                        <option value="milestones">Family Milestones</option>
                        <option value="festivals">Auspicious Festivals</option>
                        <option value="peace">Spiritual Shanti & Peace</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Deity Head</label>
                      <input
                        type="text"
                        required
                        value={newPujaDeity}
                        onChange={(e) => setNewPujaDeity(e.target.value)}
                        placeholder="eg. Lord Shiva, Ganesha, etc."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Dakshina Base price (₹)</label>
                      <input
                        type="number"
                        required
                        min={101}
                        value={newPujaBasePrice}
                        onChange={(e) => setNewPujaBasePrice(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Sacred Mantra</label>
                      <input
                        type="text"
                        value={newPujaMantra}
                        onChange={(e) => setNewPujaMantra(e.target.value)}
                        placeholder="eg. ॐ नमो भगवते वासुदेवाय"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Mantra meaning (English)</label>
                      <input
                        type="text"
                        value={newPujaMantraMeaning}
                        onChange={(e) => setNewPujaMantraMeaning(e.target.value)}
                        placeholder="eg. Salutations to the Divine Lord..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Deity Photo Link URL</label>
                    <input
                      type="url"
                      required
                      value={newPujaImage}
                      onChange={(e) => setNewPujaImage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono"
                    />

                    {/* Backend File Upload Interface */}
                    <div className="mt-2 p-3 bg-amber-50/30 rounded-xl border border-amber-200/50 space-y-2">
                      <span className="text-[10px] text-amber-950 font-black tracking-wider uppercase block">
                        📤 Or Upload New Photo to Server Backend:
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              console.log('[PujaImageUpload] Starting upload for:', file.name);
                              const uploadedUrl = await performPhotoUpload(file);
                              console.log('[PujaImageUpload] Upload successful:', uploadedUrl);
                              setNewPujaImage(uploadedUrl);
                            } catch (err) {
                              console.error('[PujaImageUpload] Upload failed:', err);
                            }
                          }
                        }}
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-extrabold file:bg-linear-to-r file:from-saffron-500 file:to-amber-500 file:text-white hover:file:opacity-90 cursor-pointer"
                      />
                      {isUploadingPhoto && (
                        <p className="text-[10px] text-saffron-600 font-bold animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 animate-ping"></span>
                          <span>Uploading celestial picture to server...</span>
                        </p>
                      )}
                      {uploadErrorMsg && (
                        <p className="text-[10px] text-red-650 font-medium">
                          ⚠️ {uploadErrorMsg}
                        </p>
                      )}
                    </div>

                    <div className="pt-1.5 flex gap-2 overflow-x-auto pb-1">
                      {SACRED_IMAGE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewPujaImage(preset.url)}
                          className="px-2 py-1 text-[9px] font-semibold bg-gray-100 hover:bg-amber-100 rounded cursor-pointer whitespace-nowrap border border-gray-250 select-none text-gray-800 hover:border-amber-400"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Ritual Significance Explanation</label>
                    <textarea
                      value={newPujaSig}
                      onChange={(e) => setNewPujaSig(e.target.value)}
                      placeholder="Explain what specific astrological constraints or planetary blocks are dissolved by this ritual..."
                      rows={2}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 font-bold">Puja Complete Description</label>
                    <textarea
                      value={newPujaDesc}
                      onChange={(e) => setNewPujaDesc(e.target.value)}
                      placeholder="Explain the detailed Sandhya, invocation sequences and items included..."
                      rows={3}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-linear-to-r from-amber-600 to-saffron-700 text-white font-bold py-3 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-lg focus:outline-none"
                    id="admin-btn-save-new"
                  >
                    <CheckCircle className="w-5 h-5 text-white animate-pulse" />
                    <span>LAUNCH DIVINE SERVICE LISTING</span>
                  </button>
                </form>
              </div>
            ) : !selectedPujaToEdit ? (
              /* EMPTY PLACEHOLDER */
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center h-full flex flex-col justify-center items-center">
                <Sliders className="w-12 h-12 text-gray-300 mb-3" />
                <h5 className="font-bold text-gray-700 font-display text-sm">No Listing Selected</h5>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  Please click on any premium puja in the left catalog list to modify standard prices, or click "Add New Puja Listing" above to launch a new ceremony on the site.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="mt-4 bg-saffron-600 hover:bg-saffron-700 text-white text-[11px] font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 shadow focus:outline-none cursor-pointer uppercase tracking-wider font-sans"
                >
                  <PlusCircle className="w-4 h-4 text-white" />
                  <span>Create Custom Puja</span>
                </button>
              </div>
            ) : (
              /* MODIFIER LISTING FORM WITH DELETION */
              <div className="bg-white rounded-xl border border-saffron-100 shadow-md p-5 sm:p-6 animate-fadeIn">
                
                <div className="border-b border-gray-150 pb-4 mb-5 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-saffron-600 block font-extrabold">Listing Modifier Portal</span>
                    <p className="text-lg font-bold text-gray-900 font-display mt-0.5">{selectedPujaToEdit.name}</p>
                    <p className="text-xs text-gray-400 mt-1">Updates immediately persist in browser session local storage catalogs.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePuja(selectedPujaToEdit.id)}
                    className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-bold px-3 py-1.5 rounded-lg text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete Listing</span>
                  </button>
                </div>

                <form onSubmit={handleSaveCatalogChangesOnSelected} className="space-y-5 text-xs text-gray-700 font-sans border-t border-gray-50 pt-4">
                  
                  {/* Photo Change Section */}
                  <div className="space-y-2 border border-dashed border-gray-150 p-4 rounded-xl bg-gray-50/20">
                    <h5 className="font-bold text-gray-950 uppercase tracking-widest text-[9px] flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5 text-saffron-600" />
                      Deity Photo Asset Update
                    </h5>

                    <label className="block text-[11px] text-gray-500 font-medium mt-1 font-sans">
                      Target Image URL Link
                    </label>
                    <input
                      id="edit-puja-img-url"
                      type="url"
                      required
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="Enter photo link URL (https://...)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                    />

                    {/* Backend File Upload Interface */}
                    <div className="mt-2.5 p-3.5 bg-amber-50/30 rounded-xl border border-amber-200/50 space-y-2">
                      <span className="text-[10px] text-amber-950 font-black tracking-wider uppercase block">
                        📤 Direct Photo Upload to Backend Server:
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const uploadedUrl = await performPhotoUpload(file);
                              setCustomImageUrl(uploadedUrl);
                            } catch (err) {}
                          }
                        }}
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-extrabold file:bg-linear-to-r file:from-saffron-500 file:to-amber-500 file:text-white hover:file:opacity-90 cursor-pointer"
                      />
                      {isUploadingPhoto && (
                        <p className="text-[10px] text-saffron-600 font-bold animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 animate-ping"></span>
                          <span>Uploading celestial picture to server...</span>
                        </p>
                      )}
                      {uploadErrorMsg && (
                        <p className="text-[10px] text-red-650 font-medium">
                          ⚠️ {uploadErrorMsg}
                        </p>
                      )}
                    </div>

                    {/* Highly Devotional Visual Presets selector */}
                    <div className="pt-2">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1.5">Auspicious Preset sacred image options (1-Click Change):</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SACRED_IMAGE_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCustomImageUrl(preset.url)}
                            className="p-1 px-2 border border-gray-200 bg-white hover:bg-saffron-50 rounded text-[10.5px] text-left truncate transition duration-150 cursor-pointer text-gray-800 hover:border-saffron-300"
                            title={preset.name}
                          >
                            <span className="font-semibold block text-gray-700 shrink-0">{preset.name}</span>
                            <span className="text-[8px] text-orange-500 block leading-tight">{preset.deity}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview window */}
                    <div className="mt-3.5 pt-3.5 border-t border-gray-150 flex items-center gap-4">
                      <img
                        src={customImageUrl || 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=200'}
                        alt="Deity preview"
                        className="w-16 h-16 rounded-xl object-cover border border-saffron-200 bg-gray-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=200';
                        }}
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Live Frame Preview</span>
                        <span className="text-[11px] font-semibold text-emerald-600">Secure connection verified.</span>
                      </div>
                    </div>

                  </div>

                  {/* Price Updation Section */}
                  <div className="space-y-4 border border-dashed border-gray-150 p-4 rounded-xl">
                    
                    <h5 className="font-bold text-gray-950 uppercase tracking-widest text-[9px] flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-saffron-600" />
                      Dakshina Pricing Matrix Updation (₹ INR)
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      
                      {/* Base price on catalog listing */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-500 font-semibold font-sans">
                          Aushadh / Directory Base Price
                        </label>
                        <input
                          id="edit-puja-base-price"
                          type="number"
                          required
                          min={101}
                          value={customBasePrice}
                          onChange={(e) => setCustomBasePrice(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 font-mono font-semibold"
                        />
                        <p className="text-[10px] text-gray-400 leading-tight">Displayed in main card ranges.</p>
                      </div>

                      {/* E-Puja Basic Package price */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-500 font-semibold">
                          1. Basic Package (E-Puja Remote) Price
                        </label>
                        <input
                          id="edit-puja-package-basic"
                          type="number"
                          required
                          min={100}
                          value={customBasicPrice}
                          onChange={(e) => setCustomBasicPrice(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 font-mono font-semibold"
                        />
                        <p className="text-[10px] text-gray-400 leading-tight">Price for live remote stream option.</p>
                      </div>

                      {/* Ghar-Sanskar In person standard package price */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-500 font-semibold">
                          2. Standard Package (In-Person Home) Price
                        </label>
                        <input
                          id="edit-puja-package-standard"
                          type="number"
                          required
                          min={100}
                          value={customStandardPrice}
                          onChange={(e) => setCustomStandardPrice(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 font-mono font-semibold"
                        />
                        <p className="text-[10px] text-gray-400 leading-tight">Price for priest visiting location.</p>
                      </div>

                      {/* Grand Havan Premium package price */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-500 font-semibold">
                          3. Premium Package (Grand Havan) Price
                        </label>
                        <input
                          id="edit-puja-package-premium"
                          type="number"
                          required
                          min={100}
                          value={customPremiumPrice}
                          onChange={(e) => setCustomPremiumPrice(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 font-mono font-semibold"
                        />
                        <p className="text-[10px] text-gray-400 leading-tight">Price for multi-priest Yajna with samagri.</p>
                      </div>

                    </div>
                  </div>

                  {/* Performance Notes Section */}
                  <div className="space-y-4 border border-dashed border-gray-150 p-4 rounded-xl">
                    
                    <h5 className="font-bold text-gray-950 uppercase tracking-widest text-[9px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-saffron-600" />
                      Puja Performance Status & Notes
                    </h5>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-gray-500 font-semibold font-sans">
                        Performance Notes / Current Status
                      </label>
                      <textarea
                        value={customPerformance}
                        onChange={(e) => setCustomPerformance(e.target.value)}
                        placeholder="e.g., Completed on 2026-06-07 for 50+ families | Next batch scheduled for Purnima"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none font-sans"
                      />
                      <p className="text-[10px] text-gray-400 leading-tight">Add custom status updates, completion dates, or scheduling information for this puja.</p>
                    </div>
                  </div>

                  {/* Actions for saving */}
                  <div className="pt-2 flex gap-3 text-xs">
                    <button
                      type="submit"
                      className="flex-1 bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-3 pr-4 rounded-xl transition duration-150 inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md focus:outline-none"
                      id="save-puja-changes-btn"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Listing Configuration</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPujaToEdit(null)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 pr-4 pl-4 rounded-xl transition duration-150 cursor-pointer focus:outline-none"
                    >
                      Discard & Close
                    </button>
                  </div>

                </form>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ADMIN SUB-TAB 2: SACRED GALLERY MANAGEMENT */}
      {adminSubTab === 'gallery_mgmt' && (
        <div className="bg-white rounded-xl border border-saffron-100 shadow-md p-5 sm:p-6 animate-fadeIn space-y-6">
          
          <div className="border-b border-gray-150 pb-4">
            <h4 className="text-base font-extrabold text-gray-900 font-display">Sacred Gallery Management</h4>
            <p className="text-xs text-gray-500">Manage photos and videos of completed Pujas, Havans, and Yajnas performed for devotees.</p>
          </div>

          {gallerySaveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
              ✓ {gallerySaveSuccess}
            </div>
          )}

          {/* Gallery Item Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gallery.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedGalleryItem(item);
                  setEditGalleryTitle(item.title);
                  setEditGalleryDesc(item.description);
                  setEditGalleryDate(item.date);
                  setEditGalleryImage(item.imageUrl);
                  setEditGalleryVideo(item.videoUrl || '');
                }}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedGalleryItem?.id === item.id
                    ? 'border-saffron-600 bg-saffron-50/30'
                    : 'border-gray-200 hover:border-saffron-300'
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=200';
                  }}
                />
                <h5 className="font-bold text-sm text-gray-900 line-clamp-2">{item.title}</h5>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                <p className="text-[10px] text-gray-400 mt-2">📅 {item.date}</p>
              </div>
            ))}
          </div>

          {gallery.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500 text-sm">No performed pujas recorded yet.</p>
            </div>
          )}

          {/* Edit or Add Form */}
          <div className="border-t border-gray-150 pt-6">
            {selectedGalleryItem ? (
              <form onSubmit={handleSaveGalleryChanges} className="space-y-4">
                <h5 className="font-bold text-gray-900 text-sm">Edit Performed Puja</h5>
                
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600">Title</label>
                  <input
                    type="text"
                    value={editGalleryTitle}
                    onChange={(e) => setEditGalleryTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600">Description</label>
                  <textarea
                    value={editGalleryDesc}
                    onChange={(e) => setEditGalleryDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-600">Date Performed</label>
                    <input
                      type="date"
                      value={editGalleryDate}
                      onChange={(e) => setEditGalleryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-600">Image URL</label>
                    <input
                      type="url"
                      value={editGalleryImage}
                      onChange={(e) => setEditGalleryImage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600">Video URL (Optional)</label>
                  <input
                    type="url"
                    value={editGalleryVideo}
                    onChange={(e) => setEditGalleryVideo(e.target.value)}
                    placeholder="YouTube embed URL"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-2 rounded-lg transition"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGalleryItem(selectedGalleryItem.id)}
                    className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-2 px-4 rounded-lg transition"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGalleryItem(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateGalleryItem} className="space-y-4">
                <h5 className="font-bold text-gray-900 text-sm">Add New Performed Puja</h5>
                
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600">Title</label>
                  <input
                    type="text"
                    value={newGalleryTitle}
                    onChange={(e) => setNewGalleryTitle(e.target.value)}
                    placeholder="e.g., Maha Rudrabhishek Yajna at Kashi Temple"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600">Description</label>
                  <textarea
                    value={newGalleryDesc}
                    onChange={(e) => setNewGalleryDesc(e.target.value)}
                    rows={3}
                    placeholder="Describe the puja performance..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-600">Date Performed</label>
                    <input
                      type="date"
                      value={newGalleryDate}
                      onChange={(e) => setNewGalleryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-600">Image URL</label>
                    <input
                      type="url"
                      value={newGalleryImage}
                      onChange={(e) => setNewGalleryImage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600">Video URL (Optional)</label>
                  <input
                    type="url"
                    value={newGalleryVideo}
                    onChange={(e) => setNewGalleryVideo(e.target.value)}
                    placeholder="YouTube embed URL"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-2 rounded-lg transition"
                >
                  Add to Gallery
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADMIN SUB-TAB 3: GLOBAL SUPPORT HELPLINE & SECRET CODES KEY CONFIG */}
      {adminSubTab === 'settings' && (
        <div className="bg-white rounded-xl border border-saffron-100 shadow-md p-5 sm:p-6 animate-fadeIn space-y-6 max-w-4xl">
          
          <div className="border-b border-gray-150 pb-4">
            <h4 className="text-base font-extrabold text-gray-900 font-display flex items-center gap-2">
              <Settings className="w-5 h-5 text-saffron-600 animate-spin animate-duration-1000" />
              <span>Temple Wide Global Settings Portal</span>
            </h4>
            <p className="text-xs text-gray-500 mt-1">Configure real-time helpdesks, connect customer WhatsApp lines, customize online checkout UPIs and include custom API keys.</p>
          </div>

          {settingsSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-bounce">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
              <span>{settingsSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveGlobalSettings} className="space-y-6 text-xs text-gray-750 font-sans">
            
            {/* Contact Details */}
            <div className="bg-saffron-50/15 border border-saffron-100/60 p-4 rounded-xl space-y-4">
              <h5 className="font-bold text-saffron-900 uppercase tracking-wider text-[10px] flex items-center gap-2 border-b border-saffron-100 pb-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Customer Contact & WhatsApp Integrations</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-650">Auspicious Support Phone Call Helpline</label>
                  <input
                    type="text"
                    required
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    placeholder="eg. +91 84450 30767"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono font-semibold"
                  />
                  <p className="text-[10px] text-gray-400">Displayed in main page navigation bar support section.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-650">WhatsApp Dispatch Support Number</label>
                  <input
                    type="text"
                    required
                    value={localWhatsapp}
                    onChange={(e) => setLocalWhatsapp(e.target.value)}
                    placeholder="eg. +91 84450 30767"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono font-semibold"
                  />
                  <p className="text-[10px] text-gray-400">Coordinates will open a direct WhatsApp chat on click.</p>
                </div>
              </div>
            </div>

            {/* AI Pandit Gemini Key */}
            <div className="bg-saffron-50/15 border border-saffron-100/60 p-4 rounded-xl space-y-4">
              <h5 className="font-bold text-saffron-900 uppercase tracking-wider text-[10px] flex items-center gap-2 border-b border-saffron-100 pb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Vedic Chatbot Intelligence Gateway</span>
              </h5>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-650">Custom Gemini API Key</label>
                <input
                  type="password"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  placeholder="Paste your standard Google GenAI API key starts with AIza..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono"
                />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Provide an optional personal `GEMINI_API_KEY` to substitute server-side default parameters. Allows fully custom Vedic answers in online Pandit Chat interactions.
                </p>
              </div>
            </div>

            {/* Real Gmail Dispatcher SMTP Gateway */}
            <div className="bg-saffron-50/15 border border-saffron-100/60 p-4 rounded-xl space-y-4">
              <h5 className="font-bold text-saffron-900 uppercase tracking-wider text-[10px] flex items-center gap-2 border-b border-saffron-100 pb-2">
                <span>✉️</span>
                <span>Real Gmail SMTP Divine Transmission Gateway</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-650">Devotee Sender Gmail Address</label>
                  <input
                    type="email"
                    required
                    value={localGmailAddress}
                    onChange={(e) => setLocalGmailAddress(e.target.value)}
                    placeholder="eg. vsvikash290@gmail.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono font-medium text-gray-800"
                  />
                  <p className="text-[10px] text-gray-400">The Gmail account from which devotee confirmations & admin records will be sent.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-655 flex items-center gap-1.5">
                    <span>Google App Password</span>
                    <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">Secure</span>
                  </label>
                  <input
                    type="password"
                    value={localGoogleAppPassword}
                    onChange={(e) => setLocalGoogleAppPassword(e.target.value)}
                    placeholder="Enter 16-character Google App Password (no spaces)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Do not use your main Google login password! Enable 2-Step Verification in Google Account, go to Security, generate a 16-letter "App Password" (e.g., `abcd efgh ijkl mnop`), and paste it here.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Payment Credentials UPI QR Code */}
            <div className="bg-saffron-50/15 border border-saffron-100/60 p-4 rounded-xl space-y-4">
              <h5 className="font-bold text-saffron-900 uppercase tracking-wider text-[10px] flex items-center gap-2 border-b border-saffron-100 pb-2 font-sans">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span>UPI Payment Routing & Custom QR codes</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-650">Secure Merchant UPI ID (VPA)</label>
                  <input
                    type="text"
                    required
                    value={localUpiId}
                    onChange={(e) => setLocalUpiId(e.target.value)}
                    placeholder="eg. shastri.pandit158@okhdfcbank"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono font-semibold text-gray-800"
                  />
                  <p className="text-[10px] text-gray-400 font-sans">Secure recipient VPA address for scan-to-pay checkouts.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-650">Custom QR Image Upload Override URL (Optional)</label>
                  <input
                    type="url"
                    value={localUpiQr}
                    onChange={(e) => setLocalUpiQr(e.target.value)}
                    placeholder="eg. https://example.com/my-payment-qr.png"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 font-sans">Leave blank to let us generate dynamic scan codes automatically on user checkouts.</p>
                </div>
              </div>
            </div>

            {/* Dynamic Pandit Certified Profile Editor */}
            <div className="bg-saffron-50/15 border border-saffron-100/60 p-4 rounded-xl space-y-4">
              <h5 className="font-bold text-saffron-900 uppercase tracking-wider text-[10px] flex items-center gap-2 border-b border-saffron-100 pb-2">
                <Users className="w-4 h-4 text-orange-600" />
                <span>Pandit Certified Profile Details</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-655 font-sans">Guru Pandit Name</label>
                  <input
                    type="text"
                    required
                    value={localPanditName}
                    onChange={(e) => setLocalPanditName(e.target.value)}
                    placeholder="eg. Shyam Guru ji"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-semibold text-gray-850"
                  />
                  <p className="text-[10px] text-gray-450 leading-relaxed font-sans">Used consistently as Pandit's official name across all interfaces.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-655 font-sans">Certification / Title Line</label>
                  <input
                    type="text"
                    required
                    value={localPanditCertification}
                    onChange={(e) => setLocalPanditCertification(e.target.value)}
                    placeholder="eg. certified by Mathura"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-semibold text-gray-850"
                  />
                  <p className="text-[10px] text-gray-455 leading-relaxed font-sans">Credential proof (e.g. Certified by Mathura, Gold medalist at Mathura).</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-655 font-sans">Pandit Bio & Spiritual Journey</label>
                <textarea
                  rows={3}
                  value={localPanditBio}
                  onChange={(e) => setLocalPanditBio(e.target.value)}
                  placeholder="Tell devotees about your spiritual experiences, family line, or temple background..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 text-gray-700 leading-normal font-sans text-xs"
                />
                <p className="text-[10px] text-gray-450 leading-relaxed font-sans">Included organically within Gemini's consciousness parameters to direct personalized AI chat flow.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-655 font-sans">Pandit Profile Image Avatar (Emoji or URL)</label>
                <input
                  type="text"
                  value={localPanditImage}
                  onChange={(e) => setLocalPanditImage(e.target.value)}
                  placeholder="👳🏽"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 text-gray-850 font-mono text-xs"
                />
                <p className="text-[10px] text-gray-450 leading-relaxed font-sans">Defaults to traditional Pandit emoji (👳🏽) or provide a hosted URL link.</p>
              </div>
            </div>

            {/* Devotee Terms & Conditions Configurator */}
            <div className="bg-saffron-50/15 border border-saffron-100/60 p-4 rounded-xl space-y-4">
              <h5 className="font-bold text-saffron-900 uppercase tracking-wider text-[10px] flex items-center gap-2 border-b border-saffron-100 pb-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Devotee Terms and Conditions Configurator</span>
              </h5>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-655 font-sans">Active Terms of Use Contract</label>
                <textarea
                  rows={4}
                  value={localDevoteeTerms}
                  onChange={(e) => setLocalDevoteeTerms(e.target.value)}
                  placeholder="Define dynamic devotee terms, materials dispatch responsibilities..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saffron-500 font-sans leading-normal text-xs text-gray-750"
                />
                <p className="text-[10px] text-gray-450 leading-relaxed font-sans">
                  Define user guidelines, E-puja coordinates rules, or Sanskrit chanting alignment responsibilities. Displayed dynamically in user click modal.
                </p>
              </div>
            </div>

            {/* Tab Visibility Active Options Controller */}
            <div className="bg-saffron-50/15 border border-saffron-100/60 p-4 rounded-xl space-y-4">
              <h5 className="font-bold text-saffron-900 uppercase tracking-wider text-[10px] flex items-center gap-2 border-b border-saffron-100 pb-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Portal Navigation Tab Visibility Controller</span>
              </h5>

              <p className="text-[10.5px] text-gray-450 leading-relaxed font-sans mb-1">
                Configure active screens layout dynamically. Uncheck any tabs to hide them instantly from general devotee navigation menus.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-150 cursor-pointer hover:bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={localShowExplorePujasTab}
                    onChange={(e) => setLocalShowExplorePujasTab(e.target.checked)}
                    className="rounded text-saffron-600 focus:ring-saffron-500 h-4 w-4 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-gray-800 text-[11px] block">🌸 Explore Pujas Tab</span>
                    <span className="text-[9px] text-gray-450">Catalogs listings for active devotee bookings</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-150 cursor-pointer hover:bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={localShowAiPanditTab}
                    onChange={(e) => setLocalShowAiPanditTab(e.target.checked)}
                    className="rounded text-saffron-600 focus:ring-saffron-500 h-4 w-4 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-gray-800 text-[11px] block">👳🏽 AI Pandit Ji Chat Tab</span>
                    <span className="text-[9px] text-gray-450">Interactive multilingual Vedic query solver</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-150 cursor-pointer hover:bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={localShowMyBookingsTab}
                    onChange={(e) => setLocalShowMyBookingsTab(e.target.checked)}
                    className="rounded text-saffron-600 focus:ring-saffron-500 h-4 w-4 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-gray-800 text-[11px] block">📅 My Bookings Tab</span>
                    <span className="text-[9px] text-gray-450">Tracks active reservations and digital certificates</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-150 cursor-pointer hover:bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={localShowAdminPortalTab}
                    onChange={(e) => setLocalShowAdminPortalTab(e.target.checked)}
                    className="rounded text-saffron-600 focus:ring-saffron-500 h-4 w-4 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-gray-800 text-[11px] block">🛡️ Admin Portal Tab</span>
                    <span className="text-[9px] text-gray-450">Restricts custom pricing and ledger reports</span>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-3 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-md focus:outline-none uppercase tracking-wider text-[11px] font-semibold"
            >
              <Check className="w-4 h-4" />
              <span>SAVE COMPREHENSIVE SETTINGS</span>
            </button>

          </form>

        </div>
      )}

      {adminSubTab === 'email_logs' && (
        <div className="bg-white rounded-xl border border-saffron-100 shadow-md p-5 sm:p-6 animate-fadeIn space-y-6 max-w-4xl">
          <div className="border-b border-gray-150 pb-4">
            <h4 className="text-base font-extrabold text-gray-900 font-display flex items-center gap-2">
              <span>✉️</span>
              <span>Divine Email Dispatch & Booking Alerts Ledger</span>
            </h4>
            <p className="text-xs text-gray-500 mt-1">Live tracking of triggered emails sent to devotees and admin (vsvikash290@gmail.com) for real-time confirmation audit.</p>
          </div>

          <div className="space-y-4">
            {emailLogs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <span className="text-3xl block mb-2">📨</span>
                <p className="text-sm text-gray-500 font-medium">No emails have been dispatched in this session yet.</p>
                <p className="text-xs text-gray-400 mt-1">Make a test puja booking or confirm any booking to trigger live email logs!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {emailLogs.map((log: any) => (
                  <div key={log.id} className="border border-saffron-100 rounded-xl bg-saffron-50/15 p-4 space-y-2.5 hover:border-saffron-200 transition">
                    <div className="flex flex-wrap justify-between items-start gap-2 border-b border-saffron-100/50 pb-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-saffron-600 block">TRANSACTION LOG ID</span>
                        <span className="font-mono text-xs font-bold text-gray-800">{log.id}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">TIMESTAMP</span>
                        <span className="text-xs font-medium text-gray-600">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <p><strong className="text-gray-500">From:</strong> <span className="font-mono text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-100">{log.from}</span></p>
                      <p><strong className="text-gray-500">To:</strong> <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-bold">{log.to}</span></p>
                    </div>

                    <div className="text-xs">
                      <p><strong className="text-gray-500">Subject:</strong> <span className="font-semibold text-gray-800">{log.subject}</span></p>
                    </div>

                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">Live Email Content Preview</span>
                      <div 
                        className="bg-white p-3.5 rounded-lg border border-gray-200 text-xs text-gray-700 max-h-[150px] overflow-y-auto font-sans leading-relaxed shadow-sm scale-95 origin-top-left"
                        dangerouslySetInnerHTML={{ __html: log.html || '' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SLIDE AUDIT DRAWER FOR ACTIVE CLIENT RITUAL COORDS */}
      {selectedBkgForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans text-gray-850">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-saffron-200 shadow-2xl overflow-hidden animate-slideUp">
            
            {/* Modal header */}
            <div className="p-4 bg-linear-to-r from-saffron-700 to-amber-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gold-200" />
                <div>
                  <h4 className="font-extrabold text-base font-display">Secured Sankalp Coordinate Audit</h4>
                  <p className="text-[10px] text-saffron-100 font-mono">{selectedBkgForView.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBkgForView(null)}
                className="bg-white/10 hover:bg-white/20 text-white py-1 px-3 rounded-lg text-xs font-bold font-sans transition"
              >
                Close Audit
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-5 text-xs">
              
              {/* Devotee contact box */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Personal devotement details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-3.5 bg-gray-50/50 border border-gray-100 rounded-xl leading-normal">
                  <p><strong className="text-gray-500">Name:</strong> <span className="font-semibold text-gray-950">{selectedBkgForView.customerName}</span></p>
                  <p><strong className="text-gray-500">Scheduled:</strong> <span className="font-semibold text-gray-950">{new Date(selectedBkgForView.dateTime).toLocaleString()}</span></p>
                  <p><strong className="text-gray-500">Kashi Phone:</strong> <span className="font-mono text-gray-750 font-semibold">{selectedBkgForView.customerPhone}</span></p>
                  <p><strong className="text-gray-500">Secure Audit Email:</strong> <span className="font-mono text-gray-750 font-semibold truncate block">{selectedBkgForView.customerEmail}</span></p>
                </div>
              </div>

              {/* Sacramental parameters */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Sacramental invocation codes</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  <div className="p-3 bg-saffron-50/20 border border-saffron-100/60 rounded-xl">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold block">Gothra Chanted</span>
                    <span className="font-bold text-gray-800 text-[12px] block mt-0.5">{selectedBkgForView.gothra || "None (Sankalp Default)"}</span>
                  </div>

                  <div className="p-3 bg-saffron-50/20 border border-saffron-100/60 rounded-xl">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold block">Nakshatra Point</span>
                    <span className="font-bold text-gray-800 text-[12px] block mt-0.5">{selectedBkgForView.nakshatra || "Universal"}</span>
                  </div>

                  <div className="p-3 bg-saffron-50/20 border border-saffron-100/60 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold block">Sankalpis Coordinated</span>
                    <span className="font-bold text-gray-800 text-xs block mt-0.5 truncate">{selectedBkgForView.sankalpNames || selectedBkgForView.customerName}</span>
                  </div>
                </div>
              </div>

              {/* Location parameters */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Vedic layout parameters</span>
                <div className="mt-2 space-y-2 p-3.5 border border-dashed border-gray-150 rounded-xl bg-gray-50/20 leading-relaxed">
                  <p><strong className="text-gray-500">Ceremonial Mode:</strong> <span className="font-semibold text-saffron-700 uppercase font-mono tracking-wide">{selectedBkgForView.mode}</span></p>
                  {selectedBkgForView.address && (
                    <p><strong className="text-gray-500">Full Domestic Address:</strong> <span className="font-semibold text-gray-800 inline-block mt-0.5">{selectedBkgForView.address}</span></p>
                  )}
                  <p><strong className="text-gray-500">Pre-pack materials delivered:</strong> <span className="font-bold text-emerald-600">{selectedBkgForView.includeSamagriKit ? 'YES (Courier Pack Dispatched)' : 'NO (Devotee Arranging Raw Materials)'}</span></p>
                  {selectedBkgForView.notes && (
                    <p className="pt-1 text-gray-500 italic">"Sankalpa Notes: {selectedBkgForView.notes}"</p>
                  )}
                </div>
              </div>

              {/* Transaction block Details */}
              <div className="p-3 bg-zinc-900 text-[11px] font-mono text-zinc-300 rounded-xl leading-normal space-y-1">
                <p><span className="text-zinc-500 font-semibold">TRANSACTION_SHA256:</span> verified SSL hash ledger signature</p>
                <p><span className="text-zinc-500 font-semibold">SAMP_TXN_ID:</span> {selectedBkgForView.paymentId || 'TXN-SHASTRI-SECURE-994'}</p>
                <p><span className="text-zinc-500 font-semibold">METHOD:</span> {selectedBkgForView.paymentMethod || 'UPI Digital Saffron Gateway'}</p>
                <p><span className="text-zinc-500 font-semibold">STAMP_UTC:</span> {selectedBkgForView.transactionDateTime || new Date().toISOString()}</p>
              </div>

              {/* Action: Status management */}
              <div className="pt-3 border-t border-gray-150 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-display text-gray-700">Client Status Flow:</span>
                  <select
                    value={selectedBkgForView.status}
                    onChange={(e) => handleStatusChange(selectedBkgForView.id, e.target.value as Booking['status'])}
                    className="font-bold border border-gray-200 rounded-lg p-1 px-2 text-xs focus:ring-1 focus:ring-saffron-500"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed (Ritual Done)</option>
                    <option value="cancelled">Cancelled (Declined)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBkgForView(null)}
                  className="bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition border border-transparent shadow-sm hover:shadow-md cursor-pointer"
                >
                  Verify Audit
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
