export interface SamagriItem {
  name: string;
  quantity: string;
  isMandatory: boolean;
  category: 'essential' | 'offering' | 'sacred' | 'fresh';
}

export interface PujaPackage {
  id: 'basic' | 'standard' | 'premium';
  name: string;
  price: number;
  description: string;
  benefits: string[];
  durationMinutes: number;
  includedSamagri: boolean; // whether materials are included in this package
  dakshinaInclusions: string[];
}

export interface Puja {
  id: string;
  name: string;
  sanskritName: string;
  tagline: string;
  description: string;
  significance: string;
  category: 'prosperity' | 'remedial' | 'milestones' | 'festivals' | 'peace' | 'education' | 'ancestral';
  deity: string;
  rating: number;
  reviewCount: number;
  durationString: string;
  basePrice: number;
  imageUrl: string;
  packages: PujaPackage[];
  samagriList: SamagriItem[];
  mantra: string;
  mantraMeaning: string;
  performance?: string; // Optional performance notes or status field
}

export interface Booking {
  id: string;
  pujaId: string;
  pujaName: string;
  pujaImage: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  gothra?: string;
  nakshatra?: string;
  sankalpNames?: string;
  mode: 'in-person-home' | 'in-person-temple' | 'e-puja';
  dateTime: string;
  language: string;
  packageId: 'basic' | 'standard' | 'premium';
  packageName: string;
  price: number;
  address?: string; // for home puja
  includeSamagriKit: boolean;
  notes?: string;
  status: 'pending-payment' | 'confirmed' | 'completed' | 'cancelled';
  paymentId?: string;
  paymentMethod?: string;
  meetingLink?: string; // for E-Puja
  transactionDateTime?: string;
  otpVerified?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'pandit';
  text: string;
  timestamp: string;
  attachedImageUrl?: string;
  attachedImageMime?: string;
}

export interface PortalSettings {
  contactPhone: string;
  whatsappNumber: string;
  geminiApiKey: string;
  upiId: string;
  upiQrUrl: string; 
  // Pandit profile details
  panditName?: string;
  panditCertification?: string;
  panditBio?: string;
  panditImage?: string;
  // Tab visibility settings
  showExplorePujasTab?: boolean;
  showAiPanditTab?: boolean;
  showMyBookingsTab?: boolean;
  showAdminPortalTab?: boolean;
  // Devotee Terms and Conditions
  devoteeTerms?: string;
  // Dynamic Real Gmail SMTP Integrations
  gmailAddress?: string;
  googleAppPassword?: string;
  // Admin credentials storage
  adminUsers?: Array<{ userId: string; passwordHash: string }>;
}

export interface UserAccount {
  userId: string; // unique username or email
  passwordHash: string; // simulated hash/password
  fullName: string;
  phone: string;
  email: string;
  gothra?: string;
  nakshatra?: string;
  createdAt: string;
  isAdmin?: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  videoUrl?: string;
}

