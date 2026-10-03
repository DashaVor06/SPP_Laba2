import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/db.js';
import { initializeDatabase } from '../src/db/initDb.js';

describe('Bus Aggregator REST API Tests', () => {
  let createdTripId;
  let createdBookingId;
  let testCarrierId;
  let testBusId;

  before(async () => {
    await initializeDatabase();
    // Get an existing carrier and bus for tests
    const carrierRes = await pool.query('SELECT id FROM carriers LIMIT 1');
    testCarrierId = carrierRes.rows[0].id;
    const busRes = await pool.query('SELECT id FROM buses WHERE carrier_id = $1 LIMIT 1', [testCarrierId]);
    testBusId = busRes.rows[0].id;
  });

  after(async () => {
    // Clean up created entities
    if (createdBookingId) {
      await pool.query('DELETE FROM bookings WHERE id = $1', [createdBookingId]);
    }
    if (createdTripId) {
      await pool.query('DELETE FROM trips WHERE id = $1', [createdTripId]);
    }
    await pool.end();
  });

  it('GET /api/health - should return UP status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'UP');
  });

  it('GET /api/trips - should list trips with seat information', async () => {
    const res = await request(app).get('/api/trips');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    
    // Check trip structure
    const trip = res.body.data[0];
    assert.ok(trip.origin_city);
    assert.ok(trip.destination_city);
    assert.ok(trip.bus_capacity > 0);
    assert.ok(Array.isArray(trip.occupied_seats));
  });

  it('POST /api/trips - should create a new trip with validation (CRUD: Create)', async () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const arrival = new Date(tomorrow.getTime() + 4 * 3600 * 1000);

    const newTrip = {
      carrierId: testCarrierId,
      busId: testBusId,
      originCity: 'Минск',
      destinationCity: 'Полоцк',
      departureStation: 'АВ Центральный',
      arrivalStation: 'АВ Полоцк',
      departureTime: tomorrow.toISOString(),
      arrivalTime: arrival.toISOString(),
      price: 26.50,
      status: 'SCHEDULED',
    };

    const res = await request(app)
      .post('/api/trips')
      .send(newTrip);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.destination_city, 'Полоцк');
    createdTripId = res.body.data.id;
  });

  it('POST /api/trips - should fail with 400 when validation fails', async () => {
    const invalidTrip = {
      carrierId: testCarrierId,
      busId: testBusId,
      originCity: 'М', // too short
      destinationCity: '',
      departureTime: 'invalid-date',
      arrivalTime: 'invalid-date',
      price: -10, // negative price
    };

    const res = await request(app)
      .post('/api/trips')
      .send(invalidTrip);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details));
  });

  it('PUT /api/trips/:id - should update trip price and details (CRUD: Update)', async () => {
    const res = await request(app)
      .put(`/api/trips/${createdTripId}`)
      .send({ price: 28.00 });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(parseFloat(res.body.data.price), 28.00);
  });

  it('POST /api/bookings - should create booking for a free seat', async () => {
    const bookingPayload = {
      tripId: createdTripId,
      seatNumber: 5,
      passengerName: 'Тестовый Пассажир',
      passengerPhone: '+375 (29) 999-88-77',
      passengerEmail: 'test@passenger.by',
    };

    const res = await request(app)
      .post('/api/bookings')
      .send(bookingPayload);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.seat_number, 5);
    createdBookingId = res.body.data.id;
  });

  it('POST /api/bookings - should return 409 Conflict when attempting to book an already occupied seat (Concurrency Protection)', async () => {
    const duplicateBookingPayload = {
      tripId: createdTripId,
      seatNumber: 5, // Already booked in previous test!
      passengerName: 'Другой Пассажир',
      passengerPhone: '+375 (29) 111-11-11',
      passengerEmail: 'other@passenger.by',
    };

    const res = await request(app)
      .post('/api/bookings')
      .send(duplicateBookingPayload);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  it('DELETE /api/bookings/:id - should cancel booking and free seat (CRUD: Delete)', async () => {
    const res = await request(app).delete(`/api/bookings/${createdBookingId}`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  });

  it('GET /api/carriers - should return list of carriers', async () => {
    const res = await request(app).get('/api/carriers');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.data.length > 0);
  });

  it('DELETE /api/trips/:id - should delete trip (CRUD: Delete)', async () => {
    const res = await request(app).delete(`/api/trips/${createdTripId}`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    createdTripId = null; // Mark cleaned up
  });

  it('GET /api/trips/999999 - should return 404 Not Found for non-existing trip', async () => {
    const res = await request(app).get('/api/trips/999999');
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
  });
});
