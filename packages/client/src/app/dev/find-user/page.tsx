import PageTemplete from "@scspace-client/Components/molecules/page/PageTemplete";
import IdLookup from "@scspace-client/Components/pages/Development/IdLookup";

export default function FindUserPage() {
    return (
        <PageTemplete title={["개발", "ID로 유저 찾기"]} subtitle={["Development", "Find User by ID"]}>
            <IdLookup kind="user" />
        </PageTemplete>
    );
}
