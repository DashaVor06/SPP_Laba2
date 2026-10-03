import React, { useState, useEffect } from 'react';
import { Bus, Plus, Edit, Trash2, Search, Clock } from './components/Icons.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { BookingModal } from './components/BookingModal.jsx';
import { TripModal } from './components/TripModal.jsx';
import { tripApi } from './api/trips.js';
import { carrierApi, busApi } from './api/carriersAndBuses.js';

export function App() {
  const [trips, setTrips] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');

  // Modals state
  const [bookingTrip, setBookingTrip] = useState(null);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  // Notifications
  const [toasts, setToasts] = useState([]);

  const notify = (type, title, message, details = null) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message, details }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load data
  const loadTrips = async () => {
    try {
      setLoading(true);
      const res = await tripApi.list({
        origin: originFilter.trim(),
        destination: destFilter.trim(),
      });
      setTrips(res.data || []);
    } catch (err) {
      notify('error', 'Ошибка загрузки', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadReferences = async () => {
    try {
      const [cRes, bRes] = await Promise.all([carrierApi.list(), busApi.list()]);
      setCarriers(cRes.data || []);
      setBuses(bRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadReferences();
    loadTrips();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTrips();
  };

  const handleResetSearch = () => {
    setOriginFilter('');
    setDestFilter('');
    tripApi.list().then((res) => setTrips(res.data || []));
  };

  // Create / Update Trip (CRUD)
  const handleSaveTrip = async (formData, tripId) => {
    try {
      if (tripId) {
        await tripApi.update(tripId, formData);
        notify('success', 'Рейс обновлен', 'Данные рейса успешно сохранены.');
      } else {
        await tripApi.create(formData);
        notify('success', 'Рейс создан', 'Новый рейс успешно добавлен.');
      }
      setTripModalOpen(false);
      setEditingTrip(null);
      loadTrips();
    } catch (err) {
      notify('error', 'Ошибка сохранения', err.message, err.details);
      throw err;
    }
  };

  // Delete Trip (CRUD)
  const handleDeleteTrip = async (tripId, title) => {
    if (!window.confirm(`Вы уверены, что хотите удалить рейс «${title}»?`)) return;
    try {
      await tripApi.delete(tripId);
      notify('success', 'Рейс удален', 'Рейс успешно удален.');
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      notify('error', 'Ошибка удаления', err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="app-header" style={{ padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-icon" style={{ width: 40, height: 40 }}>
              <Bus size={24} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.01em' }}>
              Межгород Экспресс
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.3rem' }}
            onClick={() => { setEditingTrip(null); setTripModalOpen(true); }}
          >
            <Plus size={16} />
            <span>Добавить рейс</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ padding: '1.5rem 1.5rem 3rem', flexGrow: 1 }}>
        {/* Search Bar */}
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 200px' }}>
              <input
                type="text"
                className="input-control"
                placeholder="Город отправления (напр. Минск)"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
              />
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <input
                type="text"
                className="input-control"
                placeholder="Город прибытия (напр. Гродно)"
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.2rem' }}>
              <Search size={16} />
              <span>Найти</span>
            </button>

            {(originFilter || destFilter) && (
              <button type="button" className="btn btn-secondary" onClick={handleResetSearch} style={{ padding: '0.65rem 1rem' }}>
                Сбросить
              </button>
            )}

            <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Всего рейсов: <strong>{trips.length}</strong>
            </div>
          </form>
        </div>

        {/* Trips List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Загрузка списка рейсов...
          </div>
        ) : trips.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Рейсов по выбранным параметрам не найдено.</p>
            <button className="btn btn-secondary" onClick={handleResetSearch}>Показать все рейсы</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {trips.map((trip) => {
              const freeSeats = trip.available_seats_count ?? (trip.bus_capacity - (trip.booked_seats_count || 0));
              const isFull = freeSeats <= 0;

              return (
                <div key={trip.id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Route & Times */}
                  <div style={{ minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{trip.origin_city}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 800 }}>➔</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{trip.destination_city}</span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} />
                      <span>
                        {new Date(trip.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ({trip.departure_station})
                        {' — '}
                        {new Date(trip.arrival_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ({trip.arrival_station})
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Перевозчик: <strong>{trip.carrier_name}</strong> • Автобус: {trip.bus_model}
                    </div>
                  </div>

                  {/* Seats & Price */}
                  <div style={{ textAlign: 'center', minWidth: '130px' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {parseFloat(trip.price).toFixed(2)} BYN
                    </div>
                    <span className={`seat-tag ${isFull ? 'full' : freeSeats <= 4 ? 'low' : 'available'}`} style={{ marginTop: 4 }}>
                      {isFull ? 'Мест нет' : `${freeSeats} из ${trip.bus_capacity} мест`}
                    </span>
                  </div>

                  {/* Actions (CRUD: Book, Update, Delete) */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-primary"
                      disabled={isFull}
                      onClick={() => setBookingTrip(trip)}
                      title="Забронировать билет"
                    >
                      <span>{isFull ? 'Занято' : 'Забронировать'}</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setEditingTrip(trip); setTripModalOpen(true); }}
                      title="Редактировать рейс"
                    >
                      <Edit size={15} />
                    </button>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteTrip(trip.id, `${trip.origin_city} — ${trip.destination_city}`)}
                      title="Удалить рейс"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '1rem 0', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        © Межгород Экспресс. Все права защищены.
      </footer>

      {/* Booking Modal */}
      {bookingTrip && (
        <BookingModal
          trip={bookingTrip}
          onClose={() => setBookingTrip(null)}
          onBookingChanged={loadTrips}
          onNotify={notify}
        />
      )}

      {/* Create / Edit Trip Modal */}
      {tripModalOpen && (
        <TripModal
          trip={editingTrip}
          carriers={carriers}
          buses={buses}
          onClose={() => { setTripModalOpen(false); setEditingTrip(null); }}
          onSave={handleSaveTrip}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
