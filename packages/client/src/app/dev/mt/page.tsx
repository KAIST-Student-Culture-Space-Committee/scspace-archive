import PageTemplete from "@scspace-client/Components/molecules/page/PageTemplete";
import MtAdmin from "@scspace-client/Components/pages/Development/MT";

export default function MtAdminPage() {
    return (
        <PageTemplete
            title={["개발", "MT"]}
            subtitle={["Development", "Halloween Game"]}
        >
            <MtAdmin />
        </PageTemplete>
    );
}
