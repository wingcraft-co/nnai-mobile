import { Redirect } from 'expo-router';

export default function LegacyIndexRoute() {
  return <Redirect href="/(tabs)/timeline" />;
}
