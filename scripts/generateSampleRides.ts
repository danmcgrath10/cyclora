import { rideStorageService } from '../services/rideStorage';
import { LocationPoint } from '../types/ride';

// Sample routes around popular cycling areas
const sampleRoutes = [
  {
    name: "Golden Gate Park Loop",
    startLat: 37.7694,
    startLng: -122.4862,
    distance: 8.5, // km
    duration: 1800, // 30 minutes
    points: [
      { latitude: 37.7694, longitude: -122.4862 },
      { latitude: 37.7711, longitude: -122.4831 },
      { latitude: 37.7725, longitude: -122.4798 },
      { latitude: 37.7742, longitude: -122.4765 },
      { latitude: 37.7759, longitude: -122.4732 },
      { latitude: 37.7776, longitude: -122.4699 },
      { latitude: 37.7793, longitude: -122.4666 },
      { latitude: 37.7810, longitude: -122.4633 },
      { latitude: 37.7827, longitude: -122.4600 },
      { latitude: 37.7844, longitude: -122.4567 },
      { latitude: 37.7827, longitude: -122.4534 },
      { latitude: 37.7810, longitude: -122.4501 },
      { latitude: 37.7793, longitude: -122.4468 },
      { latitude: 37.7776, longitude: -122.4435 },
      { latitude: 37.7759, longitude: -122.4402 },
      { latitude: 37.7742, longitude: -122.4369 },
      { latitude: 37.7725, longitude: -122.4336 },
      { latitude: 37.7708, longitude: -122.4303 },
      { latitude: 37.7691, longitude: -122.4270 },
      { latitude: 37.7674, longitude: -122.4237 },
      { latitude: 37.7657, longitude: -122.4270 },
      { latitude: 37.7640, longitude: -122.4303 },
      { latitude: 37.7623, longitude: -122.4336 },
      { latitude: 37.7606, longitude: -122.4369 },
      { latitude: 37.7589, longitude: -122.4402 },
      { latitude: 37.7572, longitude: -122.4435 },
      { latitude: 37.7555, longitude: -122.4468 },
      { latitude: 37.7538, longitude: -122.4501 },
      { latitude: 37.7521, longitude: -122.4534 },
      { latitude: 37.7504, longitude: -122.4567 },
      { latitude: 37.7487, longitude: -122.4600 },
      { latitude: 37.7470, longitude: -122.4633 },
      { latitude: 37.7453, longitude: -122.4666 },
      { latitude: 37.7436, longitude: -122.4699 },
      { latitude: 37.7419, longitude: -122.4732 },
      { latitude: 37.7402, longitude: -122.4765 },
      { latitude: 37.7385, longitude: -122.4798 },
      { latitude: 37.7368, longitude: -122.4831 },
      { latitude: 37.7351, longitude: -122.4864 },
      { latitude: 37.7334, longitude: -122.4897 },
      { latitude: 37.7317, longitude: -122.4930 },
      { latitude: 37.7300, longitude: -122.4963 },
      { latitude: 37.7694, longitude: -122.4862 }, // Back to start
    ]
  },
  {
    name: "Marina to Presidio",
    startLat: 37.8021,
    startLng: -122.4364,
    distance: 12.3,
    duration: 2700, // 45 minutes
    points: [
      { latitude: 37.8021, longitude: -122.4364 },
      { latitude: 37.8035, longitude: -122.4331 },
      { latitude: 37.8049, longitude: -122.4298 },
      { latitude: 37.8063, longitude: -122.4265 },
      { latitude: 37.8077, longitude: -122.4232 },
      { latitude: 37.8091, longitude: -122.4199 },
      { latitude: 37.8105, longitude: -122.4166 },
      { latitude: 37.8119, longitude: -122.4133 },
      { latitude: 37.8133, longitude: -122.4100 },
      { latitude: 37.8147, longitude: -122.4067 },
      { latitude: 37.8161, longitude: -122.4034 },
      { latitude: 37.8175, longitude: -122.4001 },
      { latitude: 37.8189, longitude: -122.3968 },
      { latitude: 37.8203, longitude: -122.3935 },
      { latitude: 37.8217, longitude: -122.3902 },
      // Continue around Presidio
      { latitude: 37.8231, longitude: -122.3869 },
      { latitude: 37.8245, longitude: -122.3836 },
      { latitude: 37.8259, longitude: -122.3803 },
      { latitude: 37.8273, longitude: -122.3770 },
      { latitude: 37.8287, longitude: -122.3737 },
      { latitude: 37.8301, longitude: -122.3704 },
      { latitude: 37.8315, longitude: -122.3671 },
      { latitude: 37.8329, longitude: -122.3638 },
      { latitude: 37.8343, longitude: -122.3605 },
      { latitude: 37.8357, longitude: -122.3572 },
      // Return path
      { latitude: 37.8343, longitude: -122.3539 },
      { latitude: 37.8329, longitude: -122.3506 },
      { latitude: 37.8315, longitude: -122.3473 },
      { latitude: 37.8301, longitude: -122.3440 },
      { latitude: 37.8287, longitude: -122.3407 },
      { latitude: 37.8273, longitude: -122.3374 },
      { latitude: 37.8259, longitude: -122.3341 },
      { latitude: 37.8245, longitude: -122.3308 },
      { latitude: 37.8231, longitude: -122.3275 },
      { latitude: 37.8217, longitude: -122.3242 },
      { latitude: 37.8203, longitude: -122.3209 },
      { latitude: 37.8189, longitude: -122.3176 },
      { latitude: 37.8175, longitude: -122.3143 },
      { latitude: 37.8161, longitude: -122.3110 },
      { latitude: 37.8147, longitude: -122.3077 },
      { latitude: 37.8133, longitude: -122.3044 },
      { latitude: 37.8119, longitude: -122.3011 },
      { latitude: 37.8105, longitude: -122.2978 },
      { latitude: 37.8091, longitude: -122.2945 },
      { latitude: 37.8077, longitude: -122.2912 },
      { latitude: 37.8063, longitude: -122.2879 },
      { latitude: 37.8049, longitude: -122.2846 },
      { latitude: 37.8035, longitude: -122.2813 },
      { latitude: 37.8021, longitude: -122.4364 }, // Back to start
    ]
  },
  {
    name: "Embarcadero Sprint",
    startLat: 37.7849,
    startLng: -122.4194,
    distance: 5.2,
    duration: 900, // 15 minutes - fast ride
    points: [
      { latitude: 37.7849, longitude: -122.4194 },
      { latitude: 37.7865, longitude: -122.4177 },
      { latitude: 37.7881, longitude: -122.4160 },
      { latitude: 37.7897, longitude: -122.4143 },
      { latitude: 37.7913, longitude: -122.4126 },
      { latitude: 37.7929, longitude: -122.4109 },
      { latitude: 37.7945, longitude: -122.4092 },
      { latitude: 37.7961, longitude: -122.4075 },
      { latitude: 37.7977, longitude: -122.4058 },
      { latitude: 37.7993, longitude: -122.4041 },
      { latitude: 37.8009, longitude: -122.4024 },
      { latitude: 37.8025, longitude: -122.4007 },
      { latitude: 37.8041, longitude: -122.3990 },
      { latitude: 37.8057, longitude: -122.3973 },
      { latitude: 37.8073, longitude: -122.3956 },
      { latitude: 37.8089, longitude: -122.3939 },
      { latitude: 37.8105, longitude: -122.3922 },
      { latitude: 37.8121, longitude: -122.3905 },
      { latitude: 37.8137, longitude: -122.3888 },
      { latitude: 37.8153, longitude: -122.3871 },
      // Quick turnaround
      { latitude: 37.8137, longitude: -122.3854 },
      { latitude: 37.8121, longitude: -122.3837 },
      { latitude: 37.8105, longitude: -122.3820 },
      { latitude: 37.8089, longitude: -122.3803 },
      { latitude: 37.8073, longitude: -122.3786 },
      { latitude: 37.8057, longitude: -122.3769 },
      { latitude: 37.8041, longitude: -122.3752 },
      { latitude: 37.8025, longitude: -122.3735 },
      { latitude: 37.8009, longitude: -122.3718 },
      { latitude: 37.7993, longitude: -122.3701 },
      { latitude: 37.7977, longitude: -122.3684 },
      { latitude: 37.7961, longitude: -122.3667 },
      { latitude: 37.7945, longitude: -122.3650 },
      { latitude: 37.7929, longitude: -122.3633 },
      { latitude: 37.7913, longitude: -122.3616 },
      { latitude: 37.7897, longitude: -122.3599 },
      { latitude: 37.7881, longitude: -122.3582 },
      { latitude: 37.7865, longitude: -122.3565 },
      { latitude: 37.7849, longitude: -122.4194 }, // Back to start
    ]
  }
];

export async function generateSampleRides(count: number = 3): Promise<void> {
  try {
    await rideStorageService.initializeDatabase();
    
    console.log(`Generating ${count} sample rides...`);
    
    for (let i = 0; i < count; i++) {
      const route = sampleRoutes[i % sampleRoutes.length];
      const now = new Date();
      const daysAgo = Math.floor(Math.random() * 30); // Random day in the last 30 days
      const rideDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Add some randomness to the route
      const baseTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
      const routePoints: LocationPoint[] = route.points.map((point, index) => ({
        latitude: point.latitude + (Math.random() - 0.5) * 0.001, // Small random variation
        longitude: point.longitude + (Math.random() - 0.5) * 0.001,
        timestamp: baseTime + index * (route.duration / route.points.length) * 1000,
        accuracy: 3 + Math.random() * 2, // 3-5m accuracy
        speed: (route.distance / (route.duration / 3600)) + (Math.random() - 0.5) * 5, // Base speed ± 2.5 km/h
      }));
      
      const averageSpeed = route.distance / (route.duration / 3600);
      const maxSpeed = averageSpeed * (1.3 + Math.random() * 0.4); // 30-70% higher than average
      
      const rideData = {
        timestamp: rideDate.toISOString(),
        distance: route.distance + (Math.random() - 0.5) * 1, // ± 0.5km variation
        duration: route.duration + (Math.random() - 0.5) * 300, // ± 2.5min variation
        averageSpeed,
        maxSpeed,
        routePoints,
        aiSummary: generateAISummary(route.name, route.distance, route.duration),
      };
      
      await rideStorageService.saveRide(rideData);
      console.log(`Generated ride: ${route.name}`);
    }
    
    console.log('Sample rides generated successfully!');
  } catch (error) {
    console.error('Failed to generate sample rides:', error);
  }
}

function generateAISummary(routeName: string, distance: number, duration: number): string {
  const summaries = [
    `Great ride through ${routeName}! You maintained a solid pace and showed excellent endurance. The route offered a perfect mix of challenges that helped improve your cycling fitness.`,
    `Fantastic performance on the ${routeName} route! Your speed consistency was impressive, and you handled the terrain changes beautifully. Keep up this momentum for your cycling goals.`,
    `Strong showing on ${routeName}! Your pacing strategy paid off well, and you demonstrated good bike handling skills throughout the ride. This distance is perfect for building your base fitness.`,
    `Excellent work on the ${routeName} circuit! You pushed through with determination and maintained great form. This ride is a solid building block for longer adventures ahead.`,
    `Well done on ${routeName}! Your cycling technique looked smooth and efficient throughout. The consistent effort you put in today will definitely contribute to your overall fitness progress.`,
  ];
  
  return summaries[Math.floor(Math.random() * summaries.length)];
}

// Export for use in development
if (require.main === module) {
  generateSampleRides(3).then(() => {
    console.log('Sample data generation complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('Failed to generate sample data:', error);
    process.exit(1);
  });
} 