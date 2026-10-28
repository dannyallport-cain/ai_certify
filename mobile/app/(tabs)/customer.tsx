import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
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
  KeyboardAwareScreen,
  TAB_BAR_CLEARANCE,
} from '@/components/keyboard/KeyboardAwareScreen';
import { CustomerJobGroupCard } from '@/components/servicem8/CustomerJobGroups';
import { StatusFilterChips } from '@/components/servicem8/StatusFilterChips';
import { Callout } from '@/components/form/Callout';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  collectStatusOptions,
  countGroupedJobs,
  groupJobsByCustomer,
  limitGroupsToJobs,
} from '@/services/servicem8/grouping';
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
import { useTheme } from '@/theme/useTheme';

/** Jobs rendered before the user asks for more — keeps the list cheap to draw. */
const JOBS_PAGE_SIZE = 10;

function buildImportedCustomerFromServiceM8Client(client: ServiceM8ClientRecord): Customer {
  return {
    id: -1,
    name:
      client.name ||
      [client.firstName, client.lastName].filter(Boolean).join(' ') ||
      'ServiceM8 Customer',
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
  const { palette } = useTheme();
  const { state, dispatch } = useJob();
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [serviceM8Search, setServiceM8Search] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [visibleJobCount, setVisibleJobCount] = useState(JOBS_PAGE_SIZE);
  const seededExpansionRef = useRef(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingJobUuid, setLoadingJobUuid] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: listCustomers,
  });

  // Jobs are fetched once and filtered/sorted/grouped locally: the whole list is
  // a few hundred rows at most, and local filtering keeps status chips, search
  // and grouping instant instead of a round trip per keystroke.
  const serviceM8JobsQuery = useQuery<ServiceM8JobRecord[]>({
    queryKey: ['servicem8-jobs'],
    queryFn: () => listServiceM8Jobs({ limit: 200 }),
  });

  const serviceM8ClientsQuery = useQuery<ServiceM8ClientRecord[]>({
    queryKey: ['servicem8-clients'],
    queryFn: () => listServiceM8Clients(),
  });

  const serviceM8AttachmentsQuery = useQuery<ServiceM8AttachmentRecord[]>({
    queryKey: ['servicem8-job-attachments', state.selectedServiceM8Job?.uuid],
    queryFn: () => listServiceM8JobAttachments(state.selectedServiceM8Job!.uuid),
    enabled: !!state.selectedServiceM8Job?.uuid,
  });

  const customers: Customer[] = (data ?? []).filter(
    (customer: Customer) =>
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (customer.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const allServiceM8Jobs = useMemo(() => serviceM8JobsQuery.data ?? [], [serviceM8JobsQuery.data]);

  const statusOptions = useMemo(() => collectStatusOptions(allServiceM8Jobs), [allServiceM8Jobs]);

  const customerGroups = useMemo(
    () =>
      groupJobsByCustomer(allServiceM8Jobs, {
        search: serviceM8Search,
        status: selectedStatus,
      }),
    [allServiceM8Jobs, serviceM8Search, selectedStatus],
  );

  // Customers with no matching job still need to be selectable, so they are
  // listed separately instead of being buried inside the grouping.
  const clientsWithoutJobs = useMemo(() => {
    const groupedKeys = new Set(customerGroups.map((group) => group.key));
    const needle = serviceM8Search.trim().toLowerCase();

    return (serviceM8ClientsQuery.data ?? [])
      .filter((client) => !groupedKeys.has(client.uuid))
      .filter((client) => {
        if (!needle) {
          return true;
        }

        const haystack = [
          client.name,
          client.companyName,
          client.firstName,
          client.lastName,
          client.email,
          client.phone,
          client.address,
        ]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .join(' ')
          .toLowerCase();

        return haystack.includes(needle);
      })
      .slice(0, 25);
  }, [customerGroups, serviceM8ClientsQuery.data, serviceM8Search]);

  // A new search or status filter is a new result set, so start from the first
  // page again rather than leaving the list scrolled deep.
  useEffect(() => {
    setVisibleJobCount(JOBS_PAGE_SIZE);
  }, [serviceM8Search, selectedStatus]);

  const totalMatchingJobs = useMemo(() => countGroupedJobs(customerGroups), [customerGroups]);

  const visibleGroups = useMemo(
    () => limitGroupsToJobs(customerGroups, visibleJobCount),
    [customerGroups, visibleJobCount],
  );

  const remainingJobCount = Math.max(0, totalMatchingJobs - visibleJobCount);

  // Open the newest customer once the first page of jobs arrives, so the screen
  // does not present a wall of collapsed rows with nothing selected.
  useEffect(() => {
    if (seededExpansionRef.current || customerGroups.length === 0) {
      return;
    }

    seededExpansionRef.current = true;
    setExpandedKeys([customerGroups[0].key]);
  }, [customerGroups]);

  function toggleGroup(key: string) {
    setExpandedKeys((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    );
  }

  const serviceM8ImageAttachments = useMemo(
    () =>
      (serviceM8AttachmentsQuery.data ?? []).filter(
        (attachment) => attachment.isImage && !!attachment.url,
      ),
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
    !!state.selectedCustomer && (!!state.selectedServiceM8Job || !!state.selectedCustomer?.id);

  const inputStyle = {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.ink,
  } as const;

  const modalInputStyle = {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.line,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.ink,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <KeyboardAwareScreen contentBottomPadding={TAB_BAR_CLEARANCE}>
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 }}>
          <AppText variant="title" style={{ marginBottom: 16 }}>
            Select Customer
          </AppText>

          <Card style={{ marginBottom: 16 }}>
            <AppText variant="heading">ServiceM8</AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2, marginBottom: 12 }}>
              Search ServiceM8 jobs or customers, load the linked job detail, and choose image
              attachments to include as evidence later in the certificate flow.
            </AppText>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: palette.line,
                backgroundColor: palette.surfaceAlt,
                paddingHorizontal: 10,
                marginBottom: 12,
              }}
            >
              <Ionicons name="cloud-outline" size={18} color={palette.info} />
              <TextInput
                style={inputStyle}
                placeholder="Search ServiceM8 jobs or customers..."
                placeholderTextColor={palette.inkSoft}
                value={serviceM8Search}
                onChangeText={setServiceM8Search}
              />
            </View>

            <StatusFilterChips
              options={statusOptions}
              selectedStatus={selectedStatus}
              totalCount={allServiceM8Jobs.length}
              onSelect={setSelectedStatus}
            />

            {serviceM8JobsQuery.isLoading ? (
              <ActivityIndicator color={palette.brand} />
            ) : serviceM8JobsQuery.isError ? (
              <Callout tone="danger" inset>
                {serviceM8JobsQuery.error instanceof Error
                  ? serviceM8JobsQuery.error.message
                  : 'Unable to load ServiceM8 jobs.'}
              </Callout>
            ) : customerGroups.length === 0 ? (
              <AppText variant="caption" tone="muted">
                {serviceM8Search.trim() || selectedStatus
                  ? 'No jobs match that search and status.'
                  : 'No active ServiceM8 jobs were found for this account.'}
              </AppText>
            ) : (
              <View>
                <AppText variant="label" tone="muted" style={{ marginBottom: 8 }}>
                  {`Showing ${Math.min(visibleJobCount, totalMatchingJobs)} of ${totalMatchingJobs} job${
                    totalMatchingJobs === 1 ? '' : 's'
                  } · newest first`}
                </AppText>

                {visibleGroups.map((group) => (
                  <CustomerJobGroupCard
                    key={group.key}
                    group={group}
                    isExpanded={expandedKeys.includes(group.key)}
                    onToggle={() => toggleGroup(group.key)}
                    selectedJobUuid={state.selectedServiceM8Job?.uuid ?? null}
                    loadingJobUuid={loadingJobUuid}
                    onSelectJob={selectServiceM8Job}
                  />
                ))}

                {remainingJobCount > 0 ? (
                  <View style={{ marginBottom: 12 }}>
                    <Button
                      label={`View more (${remainingJobCount} more job${
                        remainingJobCount === 1 ? '' : 's'
                      })`}
                      variant="soft"
                      size="small"
                      onPress={() => setVisibleJobCount((current) => current + JOBS_PAGE_SIZE)}
                      block
                    />
                  </View>
                ) : null}
              </View>
            )}

            {clientsWithoutJobs.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <AppText variant="label" tone="muted" style={{ marginBottom: 8 }}>
                  Customers without matching jobs
                </AppText>

                {clientsWithoutJobs.map((client) => {
                  const selected = state.selectedServiceM8Client?.uuid === client.uuid;
                  const displayName =
                    client.companyName?.trim() ||
                    client.name?.trim() ||
                    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
                    'Unnamed customer';

                  return (
                    <TouchableOpacity
                      key={client.uuid}
                      accessibilityRole="button"
                      onPress={() => selectServiceM8Client(client)}
                      style={{
                        marginBottom: 8,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: selected ? palette.brand : palette.line,
                        backgroundColor: selected ? palette.brandSoft : palette.surfaceAlt,
                        padding: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <AppText variant="bodyStrong" numberOfLines={1}>
                            {displayName}
                          </AppText>
                          {client.address ? (
                            <AppText variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                              {client.address}
                            </AppText>
                          ) : null}
                          {client.email ? (
                            <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                              {client.email}
                            </AppText>
                          ) : null}
                        </View>
                        {selected ? (
                          <Ionicons name="checkmark-circle" size={20} color={palette.brand} />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </Card>

          {state.selectedServiceM8Job ? (
            <Card inset style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <AppText variant="bodyStrong">Selected ServiceM8 job</AppText>
                <Button
                  label="Review"
                  variant="ghost"
                  size="small"
                  onPress={() => router.push('/(tabs)/review')}
                />
              </View>

              <AppText variant="bodyStrong">
                {state.selectedServiceM8Job.generatedJobId
                  ? `Job ${state.selectedServiceM8Job.generatedJobId}`
                  : 'ServiceM8 job selected'}
              </AppText>

              {state.selectedServiceM8JobDetail?.customer?.name ? (
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  {`Customer: ${state.selectedServiceM8JobDetail.customer.name}`}
                </AppText>
              ) : null}

              {state.selectedServiceM8JobDetail?.address || state.selectedServiceM8Job.address ? (
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  {state.selectedServiceM8JobDetail?.address || state.selectedServiceM8Job.address}
                </AppText>
              ) : null}

              <AppText variant="caption" tone="soft" style={{ marginTop: 8 }}>
                Load any useful job photos below to include as supporting evidence.
              </AppText>
            </Card>
          ) : null}

          {state.selectedServiceM8Job ? (
            <Card style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="heading">ServiceM8 job images</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    Select image attachments to keep with this draft.
                  </AppText>
                </View>
                {serviceM8AttachmentsQuery.isFetching ? (
                  <ActivityIndicator color={palette.brand} />
                ) : null}
              </View>

              {serviceM8AttachmentsQuery.isLoading ? (
                <ActivityIndicator color={palette.brand} />
              ) : serviceM8ImageAttachments.length === 0 ? (
                <AppText variant="caption" tone="muted">
                  No image attachments were found for this ServiceM8 job.
                </AppText>
              ) : (
                <>
                  {serviceM8ImageAttachments.map((attachment) => {
                    const selected = state.importedServiceM8Images.some(
                      (image) => image.attachment.uuid === attachment.uuid,
                    );

                    return (
                      <TouchableOpacity
                        key={attachment.uuid}
                        accessibilityRole="button"
                        onPress={() => toggleImportedServiceM8Image(attachment)}
                        style={{
                          marginBottom: 12,
                          overflow: 'hidden',
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: selected ? palette.brand : palette.line,
                          backgroundColor: selected ? palette.brandSoft : palette.surface,
                        }}
                      >
                        {attachment.thumbnailUrl || attachment.url ? (
                          <Image
                            source={{ uri: attachment.thumbnailUrl ?? attachment.url ?? undefined }}
                            style={{ width: '100%', height: 180 }}
                            resizeMode="cover"
                          />
                        ) : null}

                        <View style={{ padding: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                              <AppText variant="bodyStrong">
                                {attachment.fileName || 'ServiceM8 image'}
                              </AppText>
                              {attachment.editDate ? (
                                <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                                  {`Updated ${new Date(attachment.editDate).toLocaleString('en-GB')}`}
                                </AppText>
                              ) : null}
                            </View>
                            <Ionicons
                              name={selected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={selected ? palette.brand : palette.inkSoft}
                            />
                          </View>

                          <AppText
                            variant="caption"
                            tone={selected ? 'brand' : 'muted'}
                            style={{ marginTop: 6 }}
                          >
                            {selected ? 'Included for draft evidence' : 'Tap to include this image'}
                          </AppText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <AppText variant="caption" tone="soft">
                    {`${state.importedServiceM8Images.length} image(s) selected for import.`}
                  </AppText>
                </>
              )}
            </Card>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: palette.line,
              backgroundColor: palette.surfaceAlt,
              paddingHorizontal: 10,
              marginBottom: 12,
            }}
          >
            <Ionicons name="search" size={18} color={palette.inkSoft} />
            <TextInput
              style={inputStyle}
              placeholder="Search customers..."
              placeholderTextColor={palette.inkSoft}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <Button
            label="New customer"
            icon="add-circle-outline"
            variant="soft"
            onPress={() => setShowNewModal(true)}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={palette.brand} />
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {customers.length === 0 ? (
              <AppText variant="caption" tone="soft" style={{ marginTop: 32, textAlign: 'center' }}>
                No customers found.
              </AppText>
            ) : (
              customers.map((customer: Customer) => {
                const selected = state.selectedCustomer?.id === customer.id;

                return (
                  <TouchableOpacity
                    key={customer.id}
                    accessibilityRole="button"
                    onPress={() => selectCustomer(customer)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: palette.line,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        backgroundColor: selected ? palette.brand : palette.surfaceAlt,
                      }}
                    >
                      <AppText
                        variant="bodyStrong"
                        style={{ color: selected ? palette.onBrand : palette.inkMuted }}
                      >
                        {customer.name[0].toUpperCase()}
                      </AppText>
                    </View>

                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{customer.name}</AppText>
                      {customer.email ? (
                        <AppText variant="caption" tone="soft">
                          {customer.email}
                        </AppText>
                      ) : null}
                    </View>

                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={palette.brand} />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <Button
            label="Next: Review"
            icon="arrow-forward"
            size="large"
            disabled={!canContinue}
            onPress={() => router.push('/(tabs)/review')}
            block
          />
        </View>
      </KeyboardAwareScreen>

      <Modal
        visible={showNewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: palette.canvas }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 8,
            }}
          >
            <AppText variant="title">New customer</AppText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close new customer form"
              onPress={() => setShowNewModal(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.surfaceAlt,
              }}
            >
              <Ionicons name="close" size={20} color={palette.inkMuted} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScreen contentBottomPadding={48}>
            <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
              <AppText variant="bodyStrong" style={{ marginBottom: 6 }}>
                Name *
              </AppText>
              <TextInput
                style={modalInputStyle}
                placeholder="Acme Ltd"
                placeholderTextColor={palette.inkSoft}
                value={newName}
                onChangeText={setNewName}
                returnKeyType="next"
              />

              <AppText variant="bodyStrong" style={{ marginBottom: 6 }}>
                Email
              </AppText>
              <TextInput
                style={modalInputStyle}
                placeholder="contact@example.com"
                placeholderTextColor={palette.inkSoft}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={newEmail}
                onChangeText={setNewEmail}
                returnKeyType="next"
              />

              <AppText variant="bodyStrong" style={{ marginBottom: 6 }}>
                Phone
              </AppText>
              <TextInput
                style={modalInputStyle}
                placeholder="07700 000000"
                placeholderTextColor={palette.inkSoft}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />

              <View style={{ marginBottom: 12 }}>
                <Button
                  label={creating ? 'Creating…' : 'Create customer'}
                  size="large"
                  loading={creating}
                  disabled={creating}
                  onPress={handleCreate}
                  block
                />
              </View>

              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setShowNewModal(false)}
                block
              />
            </View>
          </KeyboardAwareScreen>
        </View>
      </Modal>
    </View>
  );
}
