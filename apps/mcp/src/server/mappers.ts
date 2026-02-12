import type {
  DocumentDataAttribute,
  DocumentStatus,
  SearchDateFilter,
  SearchSort,
  SortDirection
} from "../outline/types.js";

type DataAttributeInput = Array<{
  data_attribute_id: string;
  value: string | number | boolean;
}>;

export function mapDataAttributes(dataAttributes: DataAttributeInput | undefined): DocumentDataAttribute[] | undefined {
  if (!dataAttributes) {
    return undefined;
  }

  return dataAttributes.map((attribute) => ({
    dataAttributeId: attribute.data_attribute_id,
    value: attribute.value
  }));
}

export function toStatusFilter(values: DocumentStatus[] | undefined): DocumentStatus[] | undefined {
  return values && values.length > 0 ? values : undefined;
}

export function toDirection(value: SortDirection | undefined): SortDirection | undefined {
  return value;
}

export function toDateFilter(value: SearchDateFilter | undefined): SearchDateFilter | undefined {
  return value;
}

export function toSearchSort(value: SearchSort | undefined): SearchSort | undefined {
  return value;
}
