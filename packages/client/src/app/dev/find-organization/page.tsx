import PageTemplete from "@scspace-client/Components/molecules/page/PageTemplete";
import IdLookup from "@scspace-client/Components/pages/Development/IdLookup";

export default function FindOrganizationPage() {
    return (
        <PageTemplete title={["개발", "ID로 조직 찾기"]} subtitle={["Development", "Find Organization by ID"]}>
            <IdLookup kind="organization" />
        </PageTemplete>
    );
}
