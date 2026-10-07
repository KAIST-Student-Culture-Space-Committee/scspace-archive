import { useOrganizationAPI } from "@scspace-client/Hooks/organization";
import { ISelectOption } from "@scspace-client/Components/molecules/forms/Select";
import SearchSelectComponent from "@scspace-client/Components/molecules/forms/SearchSelect";
import { Dispatch, SetStateAction } from "react";
import { OrganizationStatusEnum } from "@scspace-depot/enums/organization.enum";
import { IndividualOrganizationId } from "@scspace-depot/consts/organization.const";

export function OrganizationForm({ id, setOrgId }: {
  id: number;
  setOrgId: Dispatch<SetStateAction<number>>;
}) {
  const { data: organization } = useOrganizationAPI({ uid: id }).userOrganizations;
  const organizations: ISelectOption[] = [
    {
      label: "개인 예약",
      value: IndividualOrganizationId.toString(),
      description: "use as individual"
    }
  ];

  function onChange(e: ISelectOption) {
    setOrgId(parseInt(e.value));
  }

  return (
    <SearchSelectComponent
      label="Organization Name"
      placeholder="Search organization"
      defaultValue={IndividualOrganizationId.toString()}
      optionList={organization ? ([
        ...organizations,
        ...organization.filter((o) =>
          o.status !== OrganizationStatusEnum.REJECTED &&
          o.status !== OrganizationStatusEnum.REGISTER_REQUEST
        ).map((o): ISelectOption => {
          return {
            label: o.name,
            value: o.id.toString(),
            description: "Delegator: " + o.delegator.nameKr
          }
        })
      ]) : (organizations)}
      onChange={onChange}
    />
  );
}
