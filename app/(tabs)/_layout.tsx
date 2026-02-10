import { Tabs } from 'expo-router';
import TabBar from '../../src/components/TabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Score' }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History' }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings' }}
      />
    </Tabs>
  );
}
