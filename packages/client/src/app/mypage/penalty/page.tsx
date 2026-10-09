import PageTemplete from "@scspace-client/Components/molecules/page/PageTemplete";
import UserPenalty from "@scspace-client/Components/pages/Mypage/UserPenalty";

export default function MypagePenaltyPage() {
    return (
        <PageTemplete
            title={["마이페이지", "페널티"]}
            subtitle={["Mypage", "Penalty"]}
        >
            <UserPenalty />
        </PageTemplete>
    );
}
