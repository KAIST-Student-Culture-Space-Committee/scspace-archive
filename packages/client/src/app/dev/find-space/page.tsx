import PageTemplete from "@scspace-client/Components/molecules/page/PageTemplete";
import IdLookup from "@scspace-client/Components/pages/Development/IdLookup";

export default function FindSpacePage() {
    return (
        <PageTemplete title={["개발", "ID로 공간 찾기"]} subtitle={["Development", "Find Space by ID"]}>
            <IdLookup kind="space" />
        </PageTemplete>
    );
}
