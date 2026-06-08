import React, { useState } from 'react';
import { Puja } from '../types';
import { Sparkles, Clock, Compass, Star, ChevronDown, ChevronUp, Check, BookOpen } from 'lucide-react';

interface PujaCardProps {
  puja: Puja;
  onBook: (puja: Puja) => void;
}

export default function PujaCard({ puja, onBook }: PujaCardProps) {
  const [showMantra, setShowMantra] = useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.18 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'prosperity': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'milestones': return 'bg-orange-100 text-orange-850 border-orange-200';
      case 'remedial': return 'bg-red-100 text-red-800 border-red-200';
      case 'peace': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-saffron-100 text-saffron-900 border-saffron-200';
    }
  };

  return (
    <div id={`puja-card-${puja.id}`} ref={rootRef} className="reveal-on-scroll bg-white rounded-2xl border border-saffron-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group">
      
      {/* Visual Header */}
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={puja.imageUrl}
          alt={puja.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"></div>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border ${getCategoryColor(puja.category)}`}>
            {puja.category}
          </span>
          <span className="bg-white/90 backdrop-blur-xs text-saffron-700 border border-saffron-200 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
            <span>{puja.rating}</span>
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-xs text-gold-100 font-display font-medium uppercase tracking-wider">{puja.deity}</p>
          <p className="text-[10px] text-gray-300 font-mono italic">{puja.sanskritName}</p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-bold font-display text-gray-900 group-hover:text-saffron-600 transition-colors">
          {puja.name}
        </h3>
        <p className="text-xs text-gray-500 italic mt-0.5 font-display flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-gold-500" />
          <span>{puja.sanskritName}</span>
        </p>
        <p className="text-sm text-gray-600 mt-2.5 line-clamp-2 leading-relaxed">
          {puja.tagline}
        </p>

        {/* Core Specs */}
        <div className="grid grid-cols-2 gap-3 py-3 my-3 border-y border-dashed border-saffron-100/80 text-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4 text-saffron-500" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-gray-400">Duration</p>
              <p className="font-semibold text-gray-700">{puja.durationString}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Compass className="w-4 h-4 text-saffron-500" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-gray-400">Dakshina Range</p>
              <p className="font-bold text-saffron-600 font-mono">
                ₹{puja.basePrice.toLocaleString()} - ₹{(puja.packages[puja.packages.length - 1]?.price ?? puja.basePrice).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Mantra Explainer Drawer */}
        <div className="mb-4 bg-saffron-50/50 border border-saffron-100/50 rounded-xl overflow-hidden p-2.5 transition-all duration-300">
          <button
            onClick={() => setShowMantra(!showMantra)}
            className="w-full flex justify-between items-center text-xs font-semibold text-saffron-700 hover:text-saffron-800 transition-colors focus:outline-none"
            id={`toggle-mantra-${puja.id}`}
          >
            <span className="flex items-center gap-1.5 uppercase font-display tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-saffron-500" />
              Sacred Invocation Mantra
            </span>
            {showMantra ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {showMantra && (
            <div className="mt-2.5 pt-2 border-t border-saffron-100 text-xs animate-fadeIn">
              <div className="p-2 bg-white rounded-lg border border-saffron-100 text-center text-orange-700 font-semibold mb-1.5 italic font-display">
                "{puja.mantra}"
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed pl-1">
                <strong className="text-gray-500 font-medium">Bhaavam (Meaning): </strong>
                {puja.mantraMeaning}
              </p>
            </div>
          )}
        </div>

        {/* Included benefits teaser */}
        <div className="mb-4 text-xs">
          <p className="font-semibold text-gray-700 mb-1">Ritual highlights:</p>
          <ul className="space-y-1 text-gray-500">
            <li className="flex items-start gap-1">
              <Check className="w-3.5 h-3.5 text-saffron-500 shrink-0 mt-0.5" />
              <span className="line-clamp-1">Personalized Sankalp under your Gothra</span>
            </li>
            <li className="flex items-start gap-1">
              <Check className="w-3.5 h-3.5 text-saffron-500 shrink-0 mt-0.5" />
              <span className="line-clamp-1">Panchamrit Abhishek & holy threads invocation</span>
            </li>
          </ul>
        </div>

        {/* Button selection */}
        <button
          onClick={() => onBook(puja)}
          className="mt-auto w-full bg-linear-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          id={`book-button-${puja.id}`}
        >
          <span>Select Package & Schedule</span>
          <Sparkles className="w-4 h-4 text-gold-100 animate-pulse" />
        </button>

      </div>
    </div>
  );
}
