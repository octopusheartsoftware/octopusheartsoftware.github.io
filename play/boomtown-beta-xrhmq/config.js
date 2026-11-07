// Boomtown: every number in the game lives here, so tuning is one file.
// Times are in seconds, distances in "city units" (the city map is about 240 across).
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});

  BT.CONFIG = {
    gameSeconds: 720,       // 12 minutes
    peaceSeconds: 120,      // no attacks can be sent in the first 2 minutes
    finalSeconds: 120,      // the last 2 minutes are the "final push"
    finalIncomeBoost: 1.5,  // resources come this much faster in the final push
    finalCostDiscount: 0.7, // units, turrets and trucks cost this share in the final push

    resources: ['food', 'steel', 'fuel', 'chips'],
    resourceNames: { food: 'Food', steel: 'Steel', fuel: 'Fuel', chips: 'Chips' },

    start: { stock: 60, trucks: 2, pop: 40, housing: 1 },

    // Each city is rich in two resources; workers gather those.
    richRate: 2.0,          // per second, per rich resource
    workshopBoost: 0.25,    // each Workshop adds this share

    // Population grows toward what housing can hold.
    baseCap: 50,            // the town hall alone
    housingCap: 60,         // each level of each standing Housing block
    housingMaxLevel: 4,     // tap a Housing block to build it taller, up to this many levels
    popGrowth: 0.03,        // share of the gap filled per second
    popGrowthMin: 0.3,      // at least this many people per second while below the limit
    popShrink: 0.05,        // share of any overflow that moves out per second
    popFloor: 20,           // the town hall always shelters this many people, so nobody is knocked out

    convoy: {
      load: 18,             // resources a truck brings back from another player
      homeLoad: 14,         // resources a truck brings back from the countryside
      homeTrip: 45,         // round trip, countryside
      playerTrip: 28,       // round trip, to a player who isn't sending trucks back
      routeTrip: 12,        // round trip, on a trade route (trucks both ways)
      depotBoost: 0.15,     // each Depot cuts trip times by this share
      minTripShare: 0.4,    // depots can't cut a trip below this share
      cooldown: 30,         // after an attack, no trucks between those two players for this long
    },

    // Costs. Every resource buys something on its own, again and again (first four lines).
    costs: {
      inf: { food: 30 },               // a squad of 5 infantry
      ag: { steel: 45 },               // anti-ground turret
      bomb: { fuel: 60 },              // a bomber
      aa: { chips: 45 },               // anti-air turret
      truck: { fuel: 20, steel: 15 },
      tank: { steel: 40, fuel: 30 },
      housing: { food: 25, steel: 25, fuel: 20, chips: 20 }, // needs all four, so every city has to trade to grow
      workshop: { steel: 40, chips: 30 },
      depot: { fuel: 40, food: 30 },
      barracks: { food: 30, chips: 30 },
    },
    infSquad: 5,
    truckLimit: 4, truckLimitPerDepot: 2, // trucks you can own
    buildingCostRise: 0.15, // each building of a type you already have makes the next one cost this much more
    rebuildShare: 0.5,      // rebuilding rubble costs this share of the building's price
    discounted: ['inf', 'ag', 'truck', 'tank', 'bomb', 'aa'],

    // Upgrades: 3 tiers each. Tier 1 is Chips only.
    upgrades: {
      uHp: { name: 'Unit health', other: 'food' },
      uDmg: { name: 'Unit damage', other: 'fuel' },
      bHp: { name: 'Building health', other: 'steel' },
      tDmg: { name: 'Turret damage', other: 'food' },
    },
    upgradeCosts: [{ chips: 30 }, { chips: 60, other: 40 }, { chips: 100, other: 80 }],
    upgradeStep: 0.25,      // each tier adds this share

    // Units you send. You never steer them.
    travel: { inf: 15, tank: 18, bomb: 10 }, // seconds between players before they reach the city's edge
    leaveAfter: 45,         // attackers head home after this long in a city
    units: {
      inf: { hp: 10, speed: 7, popKill: 0.8, vsDefender: 2.5, range: 10 },
      tank: { hp: 60, speed: 4.5, vsBuilding: 6, vsTurret: 10, vsDefender: 5, range: 20 },
      bomb: { hp: 25, speed: 16, popKill: 15, vsBuilding: 70, splash: 10 },
    },

    // Your defenses
    turrets: {
      ag: { hp: 80, range: 32, dps: 9 },   // shoots infantry and tanks
      aa: { hp: 60, range: 38, dps: 12 },  // shoots bombers
    },
    turretZone: [46, 58],   // turrets go on this ring around the city
    defenders: { base: 4, perBarracks: 2, hp: 12, speed: 9, range: 12, vsInf: 4, vsTank: 1.2, respawn: 8, barracksBoost: 0.2, alertRadius: 62 },
    buildingHp: 100,
    repairRate: 2,          // buildings mend this many points a second when no attackers are in town

    cityRadius: 36,         // where the buildings are
    edgeRadius: 120,        // where attackers appear
  };
})();
