"use client";

import { Dispatch, SetStateAction } from "react";
import { Button, Center, Dialog, Separator, Stack, Text } from "@chakra-ui/react";
import SimpleDialog from "@scspace-client/Components/atoms/SimpleDialog";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import { usePenaltyDetail } from "@scspace-client/Hooks/penalty";
import { IPenaltyTarget } from "@scspace-depot/types/penalty";
import PenaltySpaceStates from "./PenaltySpaceStates";
import PenaltyImposeForm from "./PenaltyImposeForm";
import PenaltyHistoryTable from "./PenaltyHistoryTable";

export default function PenaltyDialog({ open, setOpen, target, title, subtitle, onChanged }: {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    target: IPenaltyTarget | null;
    title: string;
    subtitle?: string;
    onChanged: () => void;
}) {
    const { data: detail, refetch } = usePenaltyDetail(target);

    function handleChanged() {
        refetch();
        onChanged();
    }

    return (
        <SimpleDialog open={open} setOpen={setOpen}>
            {(target && detail) ? (
                <>
                    <Dialog.Header>
                        <Stack gap={0}>
                            <Dialog.Title>{title}</Dialog.Title>
                            {subtitle && (
                                <Text color="fg.muted" fontSize="sm">{subtitle}</Text>
                            )}
                        </Stack>
                    </Dialog.Header>
                    <Separator />
                    <Dialog.Body>
                        <Stack gap={4}>
                            <PenaltySpaceStates spaces={detail.spaces} />
                            <Separator />
                            <PenaltyImposeForm
                                target={target}
                                spaces={detail.spaces}
                                onImposed={handleChanged}
                            />
                            <Separator />
                            <PenaltyHistoryTable
                                history={detail.history}
                                showIssuer
                                onDeleted={handleChanged}
                            />
                        </Stack>
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Dialog.ActionTrigger asChild>
                            <Button variant="outline" rounded="sm">Close</Button>
                        </Dialog.ActionTrigger>
                    </Dialog.Footer>
                </>
            ) : (
                <Center margin={8}>
                    <LoadingComponent />
                </Center>
            )}
        </SimpleDialog>
    );
}
