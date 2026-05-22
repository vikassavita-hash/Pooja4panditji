import { useState } from 'react';
import { Calendar, Users, MapPin, Phone } from 'lucide-react';

export default function App() {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const services = [
    { id: 'puja', name: 'Vedic Pujas', description: 'Authentic Vedic rituals and ceremonies' },
    { id: 'havan', name: 'Havan', description: 'Sacred fire rituals for prosperity' },
    { id: 'pooja', name: 'Home Pooja', description: 'Personalized home worship services' },
    { id: 'consultation', name: 'Consultation', description: 'Astrological and spiritual guidance' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-orange-600">Pooja4Panditji</h1>
          <p className="text-gray-600 mt-2">Authentic Vedic Pujas & Pandit Bookings</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Services Grid */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`p-6 rounded-lg cursor-pointer transition-all ${
                  selectedService === service.id
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'bg-white text-gray-800 shadow hover:shadow-md'
                }`}
              >
                <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                <p className="text-sm opacity-90">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow">
            <Calendar className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Easy Booking</h3>
            <p className="text-gray-600 text-sm">Schedule pujas at your convenience</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <Users className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Expert Pandits</h3>
            <p className="text-gray-600 text-sm">Experienced and certified priests</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <MapPin className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Home Service</h3>
            <p className="text-gray-600 text-sm">We come to your location</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <Phone className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">24/7 Support</h3>
            <p className="text-gray-600 text-sm">Always here to help you</p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-orange-600 text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Book a Puja?</h2>
          <p className="text-lg mb-6 opacity-90">Connect with our experienced pandits today</p>
          <button className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors">
            Book Now
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2024 Pooja4Panditji. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

