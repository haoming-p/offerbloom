import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function LoginScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🌱OfferBloom</Text>
      <Text style={styles.tagline}>Your Interview companion</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.replace('Main')}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#1C3A2A', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#4A7C5E', marginBottom: 60 },
  button: { backgroundColor: '#1C3A2A', paddingHorizontal: 48, paddingVertical: 16, borderRadius: 100 },
  buttonText: { color: '#F5F0E8', fontSize: 16, fontWeight: '600' },
});