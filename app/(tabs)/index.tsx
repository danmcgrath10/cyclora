import { RideTracker } from '@/components/RideTracker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RideScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <RideTracker />
    </SafeAreaView>
  );
}
