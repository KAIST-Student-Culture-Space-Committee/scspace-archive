import PageTemplete from "@scspace-client/Components/molecules/page/PageTemplete";
import MatchPredictions from "@scspace-client/Components/pages/Administration/MatchPredictions";

export default function MatchPredictionAdminPage() {
    return (
        <PageTemplete
            title={["운영", "경기 예측 리더보드"]}
            subtitle={["Administration", "Match Prediction Leaderboard"]}
        >
            <MatchPredictions />
        </PageTemplete>
    );
}
