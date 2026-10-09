"use client";

import { Table, Text } from "@chakra-ui/react";
import { IPenaltyRecord } from "@scspace-depot/types/penalty";
import {
    PENALTY_SPACE_TYPE_LABEL,
    PENALTY_KIND_LABEL,
    PENALTY_RESTRICTION_DAYS,
} from "@scspace-depot/consts/penalty.const";
import { PenaltyStageEnum } from "@scspace-depot/enums/penalty.enum";
import { dateUtils } from "@scspace-client/Hooks/utils";
import PenaltyDeleteBtn from "./PenaltyDeleteBtn";

export default function PenaltyHistoryTable({ history, showIssuer, onDeleted }: {
    history: IPenaltyRecord[];
    showIssuer: boolean;
    onDeleted?: () => void;
}) {
    const { getString, getDateString } = dateUtils();

    if (history.length === 0) {
        return <Text color="fg.muted">No penalty history</Text>;
    }

    return (
        <Table.ScrollArea w="100%" maxW="100%" scrollbar="hidden">
            <Table.Root size="sm" colorPalette="cyan">
                <Table.Header>
                    <Table.Row bg="bg.muted">
                        <Table.ColumnHeader>Time</Table.ColumnHeader>
                        <Table.ColumnHeader>Space</Table.ColumnHeader>
                        <Table.ColumnHeader>Kind</Table.ColumnHeader>
                        <Table.ColumnHeader>Total</Table.ColumnHeader>
                        <Table.ColumnHeader>Converted</Table.ColumnHeader>
                        <Table.ColumnHeader>Restriction</Table.ColumnHeader>
                        <Table.ColumnHeader>Reason</Table.ColumnHeader>
                        {showIssuer && <Table.ColumnHeader>Issuer</Table.ColumnHeader>}
                        {onDeleted && <Table.ColumnHeader>Delete</Table.ColumnHeader>}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {history.map((record) => (
                        <Table.Row key={record.id}>
                            <Table.Cell>{getString(record.timeImpose)}</Table.Cell>
                            <Table.Cell>{PENALTY_SPACE_TYPE_LABEL[record.spaceType].kr}</Table.Cell>
                            <Table.Cell>
                                {record.notice === 1 ? PENALTY_KIND_LABEL.NOTICE.kr : PENALTY_KIND_LABEL.WARNING.kr}
                            </Table.Cell>
                            <Table.Cell>{`${record.noticeTotal}/${record.warningTotal}`}</Table.Cell>
                            <Table.Cell>{record.converted ? "Y" : "-"}</Table.Cell>
                            <Table.Cell>
                                {record.restrictionStage === PenaltyStageEnum.NONE
                                    ? "-"
                                    : `${PENALTY_RESTRICTION_DAYS[record.restrictionStage]}일 ~${getDateString(record.restrictionEnd)}`}
                            </Table.Cell>
                            <Table.Cell>{record.reason}</Table.Cell>
                            {showIssuer && <Table.Cell>{record.issuerName ?? "-"}</Table.Cell>}
                            {onDeleted && (
                                <Table.Cell>
                                    <PenaltyDeleteBtn id={record.id} onDeleted={onDeleted} />
                                </Table.Cell>
                            )}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );
}
