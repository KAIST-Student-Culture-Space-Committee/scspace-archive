"use client";

import React, { useEffect, useState } from "react";
import {
    Stack,
    Separator,
    Grid, GridItem,
    Button,
    Text,
} from "@chakra-ui/react";
import {
    SpaceForm,
    TitleForm,
    DescriptionForm,
    InnerPeopleForm,
    OuterPeopleForm,
    FoodForm,
    DeskForm,
    ChairForm,
    WorkerForm,
    PerformanceForm,
    AllOrganizationForm
} from "@scspace-client/Components/organisms/Reservation/Forms/index";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useReservationAPI } from "@scspace-client/Hooks/reservation";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import { dateUtils } from "@scspace-client/Hooks/utils";
import ReservationCard, { IReservationRepeat } from "./ReservationCard";
import { RepeatForm } from "./Repeat";
import SubmitLog from "./SubmitLog";
import { IReservationMultipleCreateResurt } from "@scspace-depot/types/reservation";
import { DutyUtils } from "@scspace-depot/utils/duty.utils";
import DutyNoticeDialog from "../DutyNoticeDialog";

export default function CreateReservation() {
    const { userInfo, needManager } = useAuth();
    needManager();

    const _init = new Date();

    const [spaceId, setSpaceId] = useState<number>(1);
    const [orgId, setOrgId] = useState<number>(1);
    const [title, setTitle] = useState<string>("");
    const [dscrp, setDscrp] = useState<string>("");
    const [inner, setInner] = useState<number>(10);
    const [outer, setOuter] = useState<number>(0);
    const [food, setFood] = useState<string>("");
    const [worker, setWorker] = useState<boolean>(false);
    const [check, setCheck] = useState<boolean>(false);
    const [performance, setPerformance] = useState<boolean | null>(null);
    const [dutyNoticeOpen, setDutyNoticeOpen] = useState<boolean>(false);

    const createMultiReservation = useReservationAPI().createMultipleRes;

    const { getTime, getDate } = dateUtils();

    const [resList, setResList] = useState<IReservationRepeat[]>([
        {
            dateFrom: new Date(_init.getFullYear(), _init.getMonth(), _init.getDate()),
            dateTo: new Date(_init.getFullYear(), _init.getMonth(), _init.getDate()),
            hourFrom: 0,
            hourTo: 0,
            correct: true
        }
    ]);

    const [repeat, setRepeat] = useState<number>(1);
    const [submitLog, setSubmitLog] = useState<IReservationMultipleCreateResurt | null>(null);

    const [open, setOpen] = useState<boolean>(false);

    const isPerformanceSpace = spaceId === 10;

    function submit() {
        if (title === "") {
            toaster.warning({
                title: "Reservate Failed",
                description: "Please enter title"
            });
            return;
        }

        if (dscrp === "") {
            toaster.warning({
                title: "Reservate Failed",
                description: "Please enter description"
            });
            return;
        }

        if (isPerformanceSpace && performance === null) {
            toaster.warning({
                title: "Reservate Failed",
                description: "Please select whether this is a performance"
            });
            return;
        }

        if (!userInfo) return;

        const time = getTimeList();
        if (
            !(isPerformanceSpace && performance) &&
            time.some(t => DutyUtils.overlapsDutyHours(t.timeFrom, t.timeTo))
        ) {
            setDutyNoticeOpen(true);
            return;
        }

        send(time);
    }

    function getTimeList() {
        var i: number;
        var _timeFrom: Date;
        var _timeTo: Date;

        const time: {
            timeFrom: number;
            timeTo: number;
        }[] = [];

        resList.forEach((res) => {
            time.push({
                timeFrom: getTime(res.dateFrom) + getTime({ hour: res.hourFrom }),
                timeTo: getTime(res.dateTo) + getTime({ hour: res.hourTo })
            });
            _timeFrom = getDate(getTime(res.dateFrom) + getTime({ hour: res.hourFrom }));
            _timeTo = getDate(getTime(res.dateTo) + getTime({ hour: res.hourTo }));

            for (i = 1; i < repeat; i++) {
                _timeFrom.setDate(_timeFrom.getDate() + 7);
                _timeTo.setDate(_timeTo.getDate() + 7);
                time.push({
                    timeFrom: getTime(_timeFrom),
                    timeTo: getTime(_timeTo)
                });
            }
        });

        return time;
    }

    function send(time: { timeFrom: number; timeTo: number }[]) {
        if (!userInfo) return;

        setSubmitLog(null);

        createMultiReservation(
            {
                content: {
                    description: dscrp,
                    innerParticipantNumber: inner,
                    outerParticipantNumber: outer,
                    food: food,
                    busking: check && (spaceId === 13),
                    workerNeed: worker,
                    performance: isPerformanceSpace && performance === true,
                },
                userId: userInfo.id,
                // userId: 1,
                organizationId: orgId,
                spaceId: spaceId,
                title: title,
                time
            },
            {
                onSuccess: (r) => {
                    setSubmitLog(r);
                },
                onError: (error) => {
                    toaster.error({
                        title: "Reservate Failed",
                        description: error.message || "An error occurred while creating the reservation."
                    });
                },
            }
        );
        setOpen(true);
    }

    return (
        <Scroll>
            <DutyNoticeDialog
                open={dutyNoticeOpen}
                setOpen={setDutyNoticeOpen}
                onConfirm={() => send(getTimeList())}
                showPerformanceHint={isPerformanceSpace}
            />
            {submitLog && (
                <SubmitLog
                    submitLog={submitLog}
                    open={open}
                    setOpen={setOpen}
                />
            )}
            <Stack>
                <Text color="red" fontWeight={"semibold"}>
                    주의: 정기 예약 생성 시 예약이 중복되지 않도록 주의해주세요.
                </Text>
                <Grid
                    templateColumns="repeat(6, 1fr)"
                    gap={8}
                    py={2}
                >
                    <GridItem colSpan={{ base: 6, md: 3 }}>
                        <SpaceForm
                            setSpaceId={setSpaceId}
                            setCheck={setCheck}
                        />
                    </GridItem>
                    <GridItem colSpan={{ base: 6, md: 3 }}>
                        <AllOrganizationForm
                            setOrgId={setOrgId}
                        />
                    </GridItem>
                    {isPerformanceSpace && (
                        <GridItem colSpan={6}>
                            <PerformanceForm
                                value={performance}
                                setValue={setPerformance}
                            />
                        </GridItem>
                    )}
                    <GridItem colSpan={6}>
                        <ReservationCard
                            resList={resList}
                            setResList={setResList}
                        />
                    </GridItem>
                    <GridItem colSpan={6}>
                        <RepeatForm
                            count={repeat}
                            setCount={setRepeat}
                        />
                    </GridItem>
                    <GridItem colSpan={6}>
                        <TitleForm
                            title={title}
                            setTitle={setTitle}
                        />
                    </GridItem>
                    <GridItem colSpan={6}>
                        <DescriptionForm
                            description={dscrp}
                            setDescription={setDscrp}
                        />
                    </GridItem>
                    <GridItem colSpan={{ base: 6, md: 3 }}>
                        <InnerPeopleForm
                            count={inner}
                            setCount={setInner}
                        />
                    </GridItem>
                    <GridItem colSpan={{ base: 6, md: 3 }}>
                        <OuterPeopleForm
                            count={outer}
                            setCount={setOuter}
                        />
                    </GridItem>
                    <GridItem colSpan={6}>
                        <FoodForm
                            food={food}
                            setFood={setFood}
                        />
                    </GridItem>
                    <GridItem colSpan={{ base: 6, md: 2 }}>
                        <DeskForm />
                    </GridItem>
                    <GridItem colSpan={{ base: 6, md: 2 }}>
                        <ChairForm />
                    </GridItem>
                    <GridItem colSpan={{ base: 6, md: 2 }}>
                        <WorkerForm
                            value={worker}
                            setValue={setWorker}
                        />
                    </GridItem>
                </Grid>
                <Separator />
                {submitLog && (
                    <Button width="100%" onClick={() => setOpen(true)} variant={"outline"} backgroundColor={"bg"}>
                        Show Submit Log
                    </Button>
                )}
                <Button width="100%" onClick={submit}
                    disabled={resList.map((res) => res.correct).includes(false)}
                >
                    Submit
                </Button>
            </Stack >
        </Scroll >
    );
};
