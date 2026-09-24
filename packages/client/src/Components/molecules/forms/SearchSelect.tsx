import {
  Combobox,
  Portal,
  Span,
  Stack,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { SmallLoading } from "@scspace-client/Components/atoms/Loading";
import { ISelectOption } from "./Select";

export default function SearchSelectComponent({
  inDialog,
  label,
  placeholder,
  optionList,
  defaultValue,
  onChange,
}: {
  inDialog?: boolean;
  label: string;
  placeholder?: string;
  optionList: ISelectOption[];
  onChange: (e: ISelectOption) => any;
  defaultValue?: string;
}) {
  const { contains } = useFilter({ sensitivity: "base" });
  const { collection, filter, set } = useListCollection<ISelectOption>({
    initialItems: optionList,
    filter: contains,
    itemToString: (item) => `${item.label} ${item.description ?? ""}`,
    itemToValue: (item) => item.value,
  });

  const [_value, _setValue] = useState<string[]>(defaultValue ? [defaultValue] : []);
  const optionKey = JSON.stringify(optionList);

  useEffect(() => {
    set(optionList);
    // optionList is rebuilt on every parent render; only reset when its contents change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionKey]);

  return (optionList.length === 0) ? (
    <SmallLoading />
  ) : (
    <Combobox.Root
      size="lg"
      collection={collection}
      value={_value}
      defaultInputValue={optionList.find((o) => o.value === defaultValue)?.label ?? ""}
      onInputValueChange={(e) => filter(e.inputValue)}
      onValueChange={(e) => {
        if (!e.items[0]) return;
        _setValue(e.value);
        onChange(e.items[0]);
      }}
      openOnClick
    >
      <Combobox.Label>
        {label}
      </Combobox.Label>
      <Combobox.Control>
        <Combobox.Input
          rounded="sm"
          bg="white"
          placeholder={placeholder ?? "Search..."}
        />
        <Combobox.IndicatorGroup>
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal disabled={inDialog}>
        <Combobox.Positioner>
          <Combobox.Content minW="fit-content">
            <Combobox.Empty>No results</Combobox.Empty>
            {collection.items.map((o) => (
              <Combobox.Item item={o} key={o.value}>
                <Stack gap={0}>
                  <Combobox.ItemText whiteSpace="nowrap">
                    {o.label}
                  </Combobox.ItemText>
                  <Span color="fg.muted" textStyle="xs">
                    {o.description ?? ""}
                  </Span>
                </Stack>
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  );
}
