import React from 'react';
import { Puja } from '../types';
import { Clock, Star } from 'lucide-react';

interface Props {
  pujas: Puja[];
  onBook: (p: Puja) => void;
}

export default function PujaListView({ pujas, onBook }: Props) {
  if (!pujas || pujas.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-saffron-100 shadow-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-saffron-800">All Pujas (List)</h3>
        <p className="text-xs text-gray-500">Compact list view — tap a row to book</p>
      </div>

      <div className="divide-y divide-gray-100">
        {pujas.map((p) => (
          <div
            key={p.id}
            className="py-3 px-2 flex gap-3 items-start hover:bg-saffron-50/40 rounded-lg transition-all duration-200 reveal-on-scroll"
            onClick={() => onBook(p)}
          >
            <img src={p.imageUrl} alt={p.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0 shadow-sm" />

            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{p.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.tagline}</p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-400">From</div>
                  <div className="font-mono text-saffron-700 font-bold">₹{p.basePrice.toLocaleString()}</div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[12px] text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-saffron-600" />
                  <span>{p.durationString}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-gold-400" />
                  <span className="font-semibold text-gray-700">{p.rating} ({p.reviewCount})</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
