import PageTemplete from "@scspace-client/Components/molecules/page/PageTemplete";
import ManagePenalty from "@scspace-client/Components/pages/Management/Penalty";

export default function ManagePenaltyPage() {
    return (
        <PageTemplete
            title={["관리", "부과"]}
            subtitle={["Management", "Penalty"]}
        >
            <ManagePenalty />
        </PageTemplete>
    );
}
