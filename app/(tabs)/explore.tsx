import { RideHistory } from '@/components/RideHistory';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <RideHistory />
    </SafeAreaView>
  );
}
