import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';
import { listCustomers, createCustomer, type Customer } from '@/services/api';

export default function CustomerScreen() {
  const { state, dispatch } = useJob();
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: listCustomers,
  });

  const customers: Customer[] = (data ?? []).filter((customer: Customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    (customer.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  async function handleCreate() {
    if (!newName.trim()) {
      Alert.alert('Required', 'Customer name is required.');
      return;
    }
    setCreating(true);
    try {
      const customer = await createCustomer({
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
      });
      dispatch({ type: 'SET_CUSTOMER', payload: customer });
      setShowNewModal(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      refetch();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setCreating(false);
    }
  }

  function selectCustomer(customer: Customer) {
    dispatch({ type: 'SET_CUSTOMER', payload: customer });
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Select Customer</Text>

        <View className="flex-row items-center border border-gray-300 rounded-xl px-3 mb-3">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 py-3 px-2 text-base"
            placeholder="Search customers..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <TouchableOpacity
          className="flex-row items-center bg-brand/10 border border-brand rounded-xl px-4 py-3"
          onPress={() => setShowNewModal(true)}
        >
          <Ionicons name="add-circle-outline" size={22} color="#BE0000" style={{ marginRight: 8 }} />
          <Text className="text-brand font-semibold">New Customer</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-8" color="#BE0000" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
          {customers.length === 0 ? (
            <Text className="text-center text-gray-400 mt-8">No customers found.</Text>
          ) : (
            customers.map((customer: Customer) => {
              const selected = state.selectedCustomer?.id === customer.id;

              return (
                <TouchableOpacity
                  key={customer.id}
                  className={`flex-row items-center py-4 border-b border-gray-100 ${selected ? 'opacity-100' : ''}`}
                  onPress={() => selectCustomer(customer)}
                >
                  <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${selected ? 'bg-brand' : 'bg-gray-100'}`}>
                    <Text className={`font-bold ${selected ? 'text-white' : 'text-gray-500'}`}>
                      {customer.name[0].toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">{customer.name}</Text>
                    {customer.email ? <Text className="text-gray-400 text-sm">{customer.email}</Text> : null}
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color="#BE0000" />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {state.selectedCustomer && (
        <View className="px-4 pb-8 pt-3 border-t border-gray-100">
          <Text className="text-gray-500 text-sm mb-3">
            Selected: <Text className="font-semibold text-gray-800">{state.selectedCustomer.name}</Text>
          </Text>
          <TouchableOpacity
            className="bg-brand rounded-xl py-4 items-center"
            onPress={() => router.push('/(tabs)/review')}
          >
            <Text className="text-white font-bold text-base">Next: Review</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* New customer modal */}
      <Modal visible={showNewModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white px-6 pt-10">
          <Text className="text-xl font-bold text-gray-900 mb-6">New Customer</Text>

          <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
            placeholder="Acme Ltd"
            value={newName}
            onChangeText={setNewName}
          />

          <Text className="text-gray-700 mb-1 font-medium">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
            placeholder="contact@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newEmail}
            onChangeText={setNewEmail}
          />

          <Text className="text-gray-700 mb-1 font-medium">Phone</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-8 text-base"
            placeholder="07700 000000"
            keyboardType="phone-pad"
            value={newPhone}
            onChangeText={setNewPhone}
          />

          <TouchableOpacity
            className="bg-brand rounded-xl py-4 items-center mb-3"
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Create Customer</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-3"
            onPress={() => setShowNewModal(false)}
          >
            <Text className="text-gray-500">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
