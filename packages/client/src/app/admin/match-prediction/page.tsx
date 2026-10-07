import PageTemplete from "@scspace-client/Components/molecules/page/PageTemplete";
import MatchPredictions from "@scspace-client/Components/pages/Administration/MatchPredictions";

export default function MatchPredictionAdminPage() {
    return (
        <PageTemplete
            title={["운영", "승부예측 대시보드"]}
            subtitle={["Administration", "Match Prediction Dashboard"]}
        >
            <MatchPredictions />
        </PageTemplete>
    );
}
