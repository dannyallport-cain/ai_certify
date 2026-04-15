import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';
import {
  listCustomers,
  createCustomer,
  listServiceM8Clients,
  listServiceM8Jobs,
  getServiceM8Job,
  listServiceM8JobAttachments,
  type Customer,
  type ServiceM8AttachmentRecord,
  type ServiceM8ClientRecord,
  type ServiceM8JobRecord,
} from '@/services/api';

function buildImportedCustomerFromServiceM8Client(client: ServiceM8ClientRecord): Customer {
  return {
    id: -1,
    name: client.name || [client.firstName, client.lastName].filter(Boolean).join(' ') || 'ServiceM8 Customer',
    email: client.email,
    phone: client.phone,
    address: client.address,
    postcode: client.postcode,
    contactPerson: [client.firstName, client.lastName].filter(Boolean).join(' ') || null,
  };
}

function buildImportedCustomerFromJob(job: ServiceM8JobRecord): Customer {
  const fallbackName =
    [job.firstName, job.lastName].filter(Boolean).join(' ') ||
    (job.generatedJobId ? `ServiceM8 Job ${job.generatedJobId}` : 'ServiceM8 Customer');

  return {
    id: -1,
    name: fallbackName,
    email: null,
    phone: null,
    address: job.address,
    postcode: null,
    contactPerson: [job.firstName, job.lastName].filter(Boolean).join(' ') || null,
  };
}

export default function CustomerScreen() {
  const { state, dispatch } = useJob();
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [serviceM8Search, setServiceM8Search] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingJobUuid, setLoadingJobUuid] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: listCustomers,
  });

  const serviceM8JobsQuery = useQuery<ServiceM8JobRecord[]>({
    queryKey: ['servicem8-jobs', serviceM8Search],
    queryFn: () => listServiceM8Jobs({ search: serviceM8Search, limit: 12 }),
  });

  const serviceM8ClientsQuery = useQuery<ServiceM8ClientRecord[]>({
    queryKey: ['servicem8-clients', serviceM8Search],
    queryFn: () => listServiceM8Clients(serviceM8Search),
  });

  const serviceM8AttachmentsQuery = useQuery<ServiceM8AttachmentRecord[]>({
    queryKey: ['servicem8-job-attachments', state.selectedServiceM8Job?.uuid],
    queryFn: () => listServiceM8JobAttachments(state.selectedServiceM8Job!.uuid),
    enabled: !!state.selectedServiceM8Job?.uuid,
  });

  const customers: Customer[] = (data ?? []).filter((customer: Customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    (customer.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const serviceM8Jobs = useMemo(
    () => (serviceM8JobsQuery.data ?? []).slice(0, 8),
    [serviceM8JobsQuery.data],
  );

  const serviceM8Clients = useMemo(
    () => (serviceM8ClientsQuery.data ?? []).slice(0, 8),
    [serviceM8ClientsQuery.data],
  );

  const serviceM8ImageAttachments = useMemo(
    () => (serviceM8AttachmentsQuery.data ?? []).filter((attachment) => attachment.isImage && !!attachment.url),
    [serviceM8AttachmentsQuery.data],
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

  function selectServiceM8Client(client: ServiceM8ClientRecord) {
    dispatch({ type: 'SET_SERVICEM8_CLIENT', payload: client });
    dispatch({ type: 'SET_CUSTOMER', payload: buildImportedCustomerFromServiceM8Client(client) });

    if (client.address) {
      dispatch({
        type: 'SET_GPS',
        payload: {
          address: client.address,
          coords: state.gpsCoords ?? { latitude: 0, longitude: 0 },
        },
      });
    }
  }

  async function selectServiceM8Job(job: ServiceM8JobRecord) {
    try {
      setLoadingJobUuid(job.uuid);
      dispatch({ type: 'SET_SERVICEM8_JOB', payload: job });
      dispatch({ type: 'CLEAR_SERVICEM8_IMAGES' });

      if (job.address) {
        dispatch({
          type: 'SET_GPS',
          payload: {
            address: job.address,
            coords: state.gpsCoords ?? { latitude: 0, longitude: 0 },
          },
        });
      }

      const detail = await getServiceM8Job(job.uuid);
      dispatch({ type: 'SET_SERVICEM8_JOB_DETAIL', payload: detail });

      if (detail.customer) {
        dispatch({ type: 'SET_SERVICEM8_CLIENT', payload: detail.customer });
        dispatch({
          type: 'SET_CUSTOMER',
          payload: buildImportedCustomerFromServiceM8Client(detail.customer),
        });
      } else {
        dispatch({
          type: 'SET_CUSTOMER',
          payload: buildImportedCustomerFromJob(detail),
        });
      }

      if (detail.address) {
        dispatch({
          type: 'SET_GPS',
          payload: {
            address: detail.address,
            coords: state.gpsCoords ?? { latitude: 0, longitude: 0 },
          },
        });
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load ServiceM8 job');
    } finally {
      setLoadingJobUuid(null);
    }
  }

  function toggleImportedServiceM8Image(attachment: ServiceM8AttachmentRecord) {
    const alreadyImported = state.importedServiceM8Images.some(
      (image) => image.attachment.uuid === attachment.uuid,
    );

    if (alreadyImported) {
      dispatch({ type: 'REMOVE_SERVICEM8_IMAGE', payload: attachment.uuid });
      return;
    }

    if (!attachment.url) {
      Alert.alert('Unavailable', 'This attachment does not have an accessible image URL.');
      return;
    }

    dispatch({
      type: 'ADD_SERVICEM8_IMAGE',
      payload: {
        source: 'servicem8',
        url: attachment.url,
        attachment,
        importedAt: new Date().toISOString(),
      },
    });
  }

  const canContinue =
    !!state.selectedCustomer &&
    (!!state.selectedServiceM8Job || !!state.selectedCustomer?.id);

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4 pt-6 pb-3">
          <Text className="mb-4 text-2xl font-bold text-gray-900">Select Customer</Text>

          <View className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Text className="mb-2 font-semibold text-blue-900">ServiceM8</Text>
            <Text className="mb-3 text-sm text-blue-800">
              Search ServiceM8 jobs or customers, load the linked job detail, and choose image attachments to include as evidence later in the certificate flow.
            </Text>
            <View className="mb-3 flex-row items-center rounded-xl border border-blue-200 bg-white px-3">
              <Ionicons name="cloud-outline" size={18} color="#1d4ed8" />
              <TextInput
                className="flex-1 px-2 py-3 text-base"
                placeholder="Search ServiceM8 jobs or customers..."
                value={serviceM8Search}
                onChangeText={setServiceM8Search}
              />
            </View>

            {serviceM8JobsQuery.isLoading || serviceM8ClientsQuery.isLoading ? (
              <ActivityIndicator color="#1d4ed8" />
            ) : (
              <>
                {serviceM8Jobs.length > 0 ? (
                  <View className="mb-3">
                    <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800">
                      Jobs
                    </Text>
                    {serviceM8Jobs.map((job) => {
                      const selected = state.selectedServiceM8Job?.uuid === job.uuid;
                      const loading = loadingJobUuid === job.uuid;

                      return (
                        <TouchableOpacity
                          key={job.uuid}
                          className={`mb-2 rounded-xl border p-3 ${selected ? 'border-blue-500 bg-white' : 'border-blue-100 bg-white'}`}
                          onPress={() => selectServiceM8Job(job)}
                          disabled={loading}
                        >
                          <View className="flex-row items-start justify-between">
                            <View className="mr-3 flex-1">
                              <Text className="font-semibold text-gray-900">
                                {job.generatedJobId ? `Job ${job.generatedJobId}` : 'ServiceM8 Job'}
                              </Text>
                              {job.status ? (
                                <Text className="mt-1 text-xs font-medium uppercase text-blue-700">
                                  {job.status}
                                </Text>
                              ) : null}
                              {job.address ? (
                                <Text className="mt-1 text-sm text-gray-600">{job.address}</Text>
                              ) : null}
                              {job.description ? (
                                <Text className="mt-1 text-xs text-gray-500">{job.description}</Text>
                              ) : null}
                            </View>
                            {loading ? (
                              <ActivityIndicator color="#1d4ed8" />
                            ) : selected ? (
                              <Ionicons name="checkmark-circle" size={22} color="#1d4ed8" />
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {serviceM8Clients.length > 0 ? (
                  <View>
                    <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800">
                      Customers
                    </Text>
                    {serviceM8Clients.map((client) => {
                      const selected = state.selectedServiceM8Client?.uuid === client.uuid;

                      return (
                        <TouchableOpacity
                          key={client.uuid}
                          className={`mb-2 rounded-xl border p-3 ${selected ? 'border-blue-500 bg-white' : 'border-gray-100 bg-white'}`}
                          onPress={() => selectServiceM8Client(client)}
                        >
                          <View className="flex-row items-start justify-between">
                            <View className="mr-3 flex-1">
                              <Text className="font-semibold text-gray-900">{client.name}</Text>
                              {client.address ? (
                                <Text className="mt-1 text-sm text-gray-600">{client.address}</Text>
                              ) : null}
                              {client.email ? (
                                <Text className="mt-1 text-xs text-gray-500">{client.email}</Text>
                              ) : null}
                            </View>
                            {selected ? (
                              <Ionicons name="checkmark-circle" size={22} color="#1d4ed8" />
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {serviceM8Jobs.length === 0 && serviceM8Clients.length === 0 && serviceM8Search.trim() ? (
                  <Text className="text-sm text-blue-800">No ServiceM8 results found.</Text>
                ) : null}
              </>
            )}
          </View>

          {state.selectedServiceM8Job ? (
            <View className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-semibold text-gray-900">Selected ServiceM8 job</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/review')}>
                  <Text className="text-sm font-medium text-brand">Review</Text>
                </TouchableOpacity>
              </View>

              <Text className="font-semibold text-gray-800">
                {state.selectedServiceM8Job.generatedJobId
                  ? `Job ${state.selectedServiceM8Job.generatedJobId}`
                  : 'ServiceM8 job selected'}
              </Text>
              {state.selectedServiceM8JobDetail?.customer?.name ? (
                <Text className="mt-1 text-sm text-gray-600">
                  Customer: {state.selectedServiceM8JobDetail.customer.name}
                </Text>
              ) : null}
              {state.selectedServiceM8JobDetail?.address || state.selectedServiceM8Job.address ? (
                <Text className="mt-1 text-sm text-gray-600">
                  {state.selectedServiceM8JobDetail?.address || state.selectedServiceM8Job.address}
                </Text>
              ) : null}
              <Text className="mt-2 text-xs text-gray-500">
                Load any useful job photos below to include as supporting evidence.
              </Text>
            </View>
          ) : null}

          {state.selectedServiceM8Job ? (
            <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View>
                  <Text className="font-semibold text-gray-900">ServiceM8 Job Images</Text>
                  <Text className="text-sm text-gray-500">
                    Select image attachments to keep with this draft.
                  </Text>
                </View>
                {serviceM8AttachmentsQuery.isFetching ? (
                  <ActivityIndicator color="#111827" />
                ) : null}
              </View>

              {serviceM8AttachmentsQuery.isLoading ? (
                <ActivityIndicator color="#111827" />
              ) : serviceM8ImageAttachments.length === 0 ? (
                <Text className="text-sm text-gray-500">
                  No image attachments were found for this ServiceM8 job.
                </Text>
              ) : (
                <>
                  {serviceM8ImageAttachments.map((attachment) => {
                    const selected = state.importedServiceM8Images.some(
                      (image) => image.attachment.uuid === attachment.uuid,
                    );

                    return (
                      <TouchableOpacity
                        key={attachment.uuid}
                        className={`mb-3 overflow-hidden rounded-2xl border ${selected ? 'border-brand bg-red-50' : 'border-gray-200 bg-white'}`}
                        onPress={() => toggleImportedServiceM8Image(attachment)}
                      >
                        {attachment.thumbnailUrl || attachment.url ? (
                          <Image
                            source={{ uri: attachment.thumbnailUrl ?? attachment.url ?? undefined }}
                            style={{ width: '100%', height: 180 }}
                            resizeMode="cover"
                          />
                        ) : null}

                        <View className="p-3">
                          <View className="flex-row items-start justify-between">
                            <View className="mr-3 flex-1">
                              <Text className="font-medium text-gray-900">
                                {attachment.fileName || 'ServiceM8 image'}
                              </Text>
                              {attachment.editDate ? (
                                <Text className="mt-1 text-xs text-gray-500">
                                  Updated {new Date(attachment.editDate).toLocaleString('en-GB')}
                                </Text>
                              ) : null}
                            </View>
                            <Ionicons
                              name={selected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={selected ? '#BE0000' : '#6b7280'}
                            />
                          </View>
                          <Text className="mt-2 text-sm text-gray-600">
                            {selected ? 'Included for draft evidence' : 'Tap to include this image'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <Text className="text-xs text-gray-500">
                    {state.importedServiceM8Images.length} image(s) selected for import.
                  </Text>
                </>
              )}
            </View>
          ) : null}

          <View className="mb-3 flex-row items-center rounded-xl border border-gray-300 px-3">
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 px-2 py-3 text-base"
              placeholder="Search customers..."
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <TouchableOpacity
            className="flex-row items-center rounded-xl border border-brand bg-brand/10 px-4 py-3"
            onPress={() => setShowNewModal(true)}
          >
            <Ionicons name="add-circle-outline" size={22} color="#BE0000" style={{ marginRight: 8 }} />
            <Text className="font-semibold text-brand">New Customer</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator className="mt-8" color="#BE0000" />
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {customers.length === 0 ? (
              <Text className="mt-8 text-center text-gray-400">No customers found.</Text>
            ) : (
              customers.map((customer: Customer) => {
                const selected = state.selectedCustomer?.id === customer.id;

                return (
                  <TouchableOpacity
                    key={customer.id}
                    className={`flex-row items-center border-b border-gray-100 py-4 ${selected ? 'opacity-100' : ''}`}
                    onPress={() => selectCustomer(customer)}
                  >
                    <View
                      className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${selected ? 'bg-brand' : 'bg-gray-100'}`}
                    >
                      <Text className={`font-bold ${selected ? 'text-white' : 'text-gray-500'}`}>
                        {customer.name[0].toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900">{customer.name}</Text>
                      {customer.email ? <Text className="text-sm text-gray-400">{customer.email}</Text> : null}
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color="#BE0000" />}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <View className="px-4 pt-5">
          <TouchableOpacity
            className={`items-center rounded-xl py-4 ${canContinue ? 'bg-brand' : 'bg-gray-300'}`}
            onPress={() => router.push('/(tabs)/review')}
            disabled={!canContinue}
          >
            <Text className={`text-base font-bold ${canContinue ? 'text-white' : 'text-gray-500'}`}>
              Next: Review
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showNewModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white px-6 pt-10">
          <Text className="mb-6 text-xl font-bold text-gray-900">New Customer</Text>

          <Text className="mb-1 font-medium text-gray-700">Name *</Text>
          <TextInput
            className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-base"
            placeholder="Acme Ltd"
            value={newName}
            onChangeText={setNewName}
          />

          <Text className="mb-1 font-medium text-gray-700">Email</Text>
          <TextInput
            className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-base"
            placeholder="contact@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newEmail}
            onChangeText={setNewEmail}
          />

          <Text className="mb-1 font-medium text-gray-700">Phone</Text>
          <TextInput
            className="mb-8 rounded-xl border border-gray-300 px-4 py-3 text-base"
            placeholder="07700 000000"
            keyboardType="phone-pad"
            value={newPhone}
            onChangeText={setNewPhone}
          />

          <TouchableOpacity
            className="mb-3 items-center rounded-xl bg-brand py-4"
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-bold text-white">Create Customer</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="items-center py-3" onPress={() => setShowNewModal(false)}>
            <Text className="text-gray-500">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}