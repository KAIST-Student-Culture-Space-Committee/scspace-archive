import { Flex, RadioGroup } from "@chakra-ui/react";
import FieldComponent from "@scspace-client/Components/atoms/Field";
import { Dispatch, SetStateAction } from "react";

export function PerformanceForm({ value, setValue }: {
  value: boolean | null;
  setValue: Dispatch<SetStateAction<boolean | null>>;
}) {
  return (
    <FieldComponent
      options={{
        label: "Performance / 공연 여부",
      }}
    >
      <RadioGroup.Root
        value={value === null ? null : String(value)}
        onValueChange={(target) => setValue(target.value === "true")}
        colorPalette={"blue"}
      >
        <Flex justify={"start"} gap={4}>
          {[
            { value: "true", label: "공연 / Performance" },
            { value: "false", label: "공연 아님 / Not a performance" },
          ].map((option) => (
            <RadioGroup.Item key={option.value} value={option.value}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.Label>
                {option.label}
              </RadioGroup.Label>
            </RadioGroup.Item>
          ))}
        </Flex>
      </RadioGroup.Root>
    </FieldComponent>
  );
}
