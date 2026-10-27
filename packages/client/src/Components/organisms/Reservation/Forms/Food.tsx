import InputComponent from "@scspace-client/Components/molecules/forms/Input";
import { Dispatch, SetStateAction } from "react";

export function FoodForm({ food, setFood }: {
  food: string;
  setFood: Dispatch<SetStateAction<string>>;
}) {
  return (
    <InputComponent
      label="Food"
      placeholder="Explanation About Food/Beverage"
      value={food}
      onChange={setFood}
      helpertext="Please explain what food/beverage you will eat/drink in the space if you have."
    />
  );
}

