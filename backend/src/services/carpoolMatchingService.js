const axios = require('axios');
const { config } = require('../config/env');
const CarpoolRequest = require('../models/CarpoolRequest');
const CarpoolMatch = require('../models/CarpoolMatch');

class CarpoolMatchingService {
  // ── Find compatible requests ───────────────────────────────────────────────
  async findMatches(newRequest) {
    const depTime = new Date(newRequest.departureTime);
    const windowMs = (newRequest.timeWindowMinutes || 30) * 60 * 1000;

    // Find pending requests within time window and geographic proximity
    const candidates = await CarpoolRequest.find({
      status: 'pending',
      _id: { $ne: newRequest._id },
      userId: { $ne: newRequest.userId },
      departureTime: {
        $gte: new Date(depTime.getTime() - windowMs),
        $lte: new Date(depTime.getTime() + windowMs),
      },
    })
      .populate('userId', 'name avatar vehicleType preferences')
      .limit(50);

    // Filter by geographic proximity (pickup within ~3km)
    const nearby = candidates.filter((req) => {
      const dist = this._haversine(
        newRequest.pickup.lat, newRequest.pickup.lng,
        req.pickup.lat, req.pickup.lng
      );
      return dist <= 3.0;
    });

    return nearby;
  }

  // ── Call AI service for DBSCAN matching ───────────────────────────────────
  async matchViaAI(requests) {
    try {
      const payload = {
        passengers: requests.map((r) => ({
          id: r._id.toString(),
          pickup: { lat: r.pickup.lat, lng: r.pickup.lng },
          dropoff: { lat: r.dropoff.lat, lng: r.dropoff.lng },
          departure_time: r.departureTimeStr || '08:00',
          preferences: r.preferences || {},
        })),
        max_detour_minutes: 10,
        max_passengers_per_vehicle: 4,
        time_window_minutes: 30,
      };

      const res = await axios.post(
        `${config.aiServiceUrl}/api/carpool/match`,
        payload,
        { timeout: 20000 }
      );
      return res.data;
    } catch (err) {
      console.warn('AI carpool matching failed, using local:', err.message);
      return this._localMatch(requests);
    }
  }

  // ── Local fallback matching (proximity-based) ─────────────────────────────
  _localMatch(requests) {
    const groups = [];
    const unmatched = [...requests];
    const used = new Set();

    for (let i = 0; i < unmatched.length; i++) {
      if (used.has(i)) continue;
      const group = [unmatched[i]];
      used.add(i);

      for (let j = i + 1; j < unmatched.length; j++) {
        if (used.has(j) || group.length >= 4) continue;
        const dist = this._haversine(
          unmatched[i].pickup.lat, unmatched[i].pickup.lng,
          unmatched[j].pickup.lat, unmatched[j].pickup.lng
        );
        if (dist <= 2.0) {
          group.push(unmatched[j]);
          used.add(j);
        }
      }

      if (group.length >= 2) {
        groups.push({
          group_id: `local_${Date.now()}_${i}`,
          passengers: group.map((r) => ({
            id: r._id?.toString() || r.id,
            pickup: r.pickup,
            dropoff: r.dropoff,
          })),
          passenger_count: group.length,
          estimated_savings_percent: Math.round(((group.length - 1) / group.length) * 100),
        });
      }
    }

    return {
      groups,
      unmatched: requests.filter((_, i) => !used.has(i)),
      stats: { total_requests: requests.length, matched: used.size },
    };
  }

  // ── Create CarpoolMatch document ──────────────────────────────────────────
  async createMatchDocument(group, requestDocs) {
    const passengers = group.passengers.map((p, idx) => {
      const reqDoc = requestDocs.find((r) => r._id.toString() === p.id);
      return {
        userId: reqDoc?.userId,
        requestId: reqDoc?._id,
        pickup: p.pickup,
        dropoff: p.dropoff,
        pickupOrder: idx,
      };
    });

    const totalDist = this._estimateSharedDistance(group.passengers);
    const emissionG = totalDist * 150;
    const n = group.passengers.length;
    const individualTotal = group.passengers.reduce((sum, p) => {
      return sum + this._haversine(p.pickup.lat, p.pickup.lng, p.dropoff.lat, p.dropoff.lng) * 150;
    }, 0);
    const co2Saved = Math.max(0, individualTotal - emissionG);
    const savingsPct = individualTotal > 0 ? Math.round((co2Saved / individualTotal) * 100) : 0;

    const match = new CarpoolMatch({
      groupId: group.group_id || `match_${Date.now()}`,
      passengers,
      passengerCount: n,
      sharedRoute: {
        totalDistanceKm: Math.round(totalDist * 100) / 100,
        estimatedTimeMin: Math.round((totalDist / 30) * 60),
      },
      totalEmissionG: Math.round(emissionG),
      co2SavedG: Math.round(co2Saved),
      savingsPercent: savingsPct,
      perPassengerEmissionG: Math.round(emissionG / n),
      greenScore: Math.min(100, 50 + savingsPct / 2),
      status: 'confirmed',
    });

    await match.save();
    return match;
  }

  // ── Update request statuses ───────────────────────────────────────────────
  async updateRequestStatuses(requestIds, matchId, matchedUserIds) {
    await CarpoolRequest.updateMany(
      { _id: { $in: requestIds } },
      {
        status: 'matched',
        matchId,
        matchedWith: matchedUserIds,
      }
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  _estimateSharedDistance(passengers) {
    if (passengers.length === 0) return 0;
    let total = 0;
    // Pickup-to-pickup distances
    for (let i = 0; i < passengers.length - 1; i++) {
      total += this._haversine(
        passengers[i].pickup.lat, passengers[i].pickup.lng,
        passengers[i + 1].pickup.lat, passengers[i + 1].pickup.lng
      );
    }
    // Last pickup to first dropoff
    total += this._haversine(
      passengers[passengers.length - 1].pickup.lat,
      passengers[passengers.length - 1].pickup.lng,
      passengers[0].dropoff.lat,
      passengers[0].dropoff.lng
    );
    // Dropoff-to-dropoff distances
    for (let i = 0; i < passengers.length - 1; i++) {
      total += this._haversine(
        passengers[i].dropoff.lat, passengers[i].dropoff.lng,
        passengers[i + 1].dropoff.lat, passengers[i + 1].dropoff.lng
      );
    }
    return total * 1.15; // 15% overhead for real roads vs straight-line
  }
}

module.exports = new CarpoolMatchingService();