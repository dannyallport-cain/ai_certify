/**
 * Sample data set shape used to auto-fill certificate forms.
 *
 * Field keys map directly to form element `name` attributes, except:
 * - `address:`-prefixed keys target the hidden field of an AddressAutocompleteField.
 * - `radioIds` entries are element ids of radio buttons to select.
 * - `checkboxNames` entries are `name` attributes of checkboxes to tick.
 */
export type SampleData = {
  /** Form values keyed by element name (or `address:<name>` for address fields). */
  fields: Record<string, string>;
  /** Element ids of radio buttons that should be selected when filling the form. */
  radioIds?: string[];
  /** `name` attributes of checkboxes that should be ticked when filling the form. */
  checkboxNames?: string[];
};
