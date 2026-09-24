"use client";

import { useOrganizationAPI } from "@scspace-client/Hooks/organization";
import { ISelectOption } from "@scspace-client/Components/molecules/forms/Select";
import SearchSelectComponent from "@scspace-client/Components/molecules/forms/SearchSelect";
import { Dispatch, SetStateAction } from "react";
import { useAuth } from "@scspace-client/Hooks/auth";
import { OrganizationStatusEnum } from "@scspace-depot/enums/organization.enum";

export function AllOrganizationForm({ setOrgId }: {
  setOrgId: Dispatch<SetStateAction<number>>;
}) {
  const { needManager } = useAuth();
  needManager();

  const { data: organization } = useOrganizationAPI().allOrganizations;

  function onChange(e: ISelectOption) {
    setOrgId(parseInt(e.value));
  }

  return (
    <SearchSelectComponent
      label="Organization Name"
      placeholder="Search organization"
      optionList={organization ? ([
        ...organization.filter(
          (o) => o.status !== OrganizationStatusEnum.REJECTED && o.status !== OrganizationStatusEnum.REGISTER_REQUEST
        ).map((o): ISelectOption => {
          return {
            label: o.name,
            value: o.id.toString(),
            description: "Delegator: " + o.delegator.nameKr
          }
        })
      ]) : []}
      onChange={onChange}
    />
  );
}
