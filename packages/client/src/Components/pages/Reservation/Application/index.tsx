"use client";

import React, { useEffect, useState } from "react";
import {
  Stack,
  Separator,
  Grid, GridItem,
  Button,
  Checkbox,
  Text,
  Alert,
} from "@chakra-ui/react";
import {
  SpaceForm,
  OrganizationForm,
  TitleForm,
  DescriptionForm,
  InnerPeopleForm,
  OuterPeopleForm,
  FoodForm,
  DeskForm,
  ChairForm,
  WorkerForm,
  PerformanceForm,
  DateForm,
  HourForm
} from "@scspace-client/Components/organisms/Reservation/Forms/index";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import { useAuth } from "@scspace-client/Hooks/auth";
import { SmallLoading } from "@scspace-client/Components/atoms/Loading";
import { CalendarView } from "@scspace-client/Components/organisms/Reservation/Calendar";
import { useReservationAPI } from "@scspace-client/Hooks/reservation";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import { dateUtils } from "@scspace-client/Hooks/utils";
import InputComponent from "@scspace-client/Components/molecules/forms/Input";
import { useMailAPI } from "@scspace-client/Hooks/mail";
import { IndividualOrganizationId } from "@scspace-depot/consts/organization.const";
import { useAllSpace } from "@scspace-client/Hooks/space";
import { useMyPenalty } from "@scspace-client/Hooks/penalty";
import { PENALTY_SPACE_TYPE_LABEL } from "@scspace-depot/consts/penalty.const";
import { PenaltyStageEnum } from "@scspace-depot/enums/penalty.enum";

export default function ReservationApplication() {
  const { userInfo, needLogin, isManager } = useAuth();
  needLogin();

  const _init = new Date();
  const [dateFrom, setDateFrom] = useState<Date>(() => new Date(_init.getFullYear(), _init.getMonth(), _init.getDate()));
  const [dateTo, setDateTo] = useState<Date>(() => new Date(_init.getFullYear(), _init.getMonth(), _init.getDate()));

  useEffect(() => {
    setDateTo((current) => (dateFrom > current ? dateFrom : current));
  }, [dateFrom]);

  useEffect(() => {
    setDateFrom((current) => (current > dateTo ? dateTo : current));
  }, [dateTo]);

  const [hourFrom, setHourFrom] = useState<number>(0);
  const [hourTo, setHourTo] = useState<number>(0);

  const [spaceId, setSpaceId] = useState<number>(1);
  const [orgId, setOrgId] = useState<number>(IndividualOrganizationId);
  const [title, setTitle] = useState<string>("");
  const [dscrp, setDscrp] = useState<string>("");
  const [inner, setInner] = useState<number>(10);
  const [outer, setOuter] = useState<number>(0);
  const [food, setFood] = useState<string>("");
  const [worker, setWorker] = useState<boolean>(false);
  const [check, setCheck] = useState<boolean>(false);
  const [workerNeedReason, setWorkerNeedReason] = useState<string>("");
  const [performance, setPerformance] = useState<boolean | null>(null);
  const [reservationTypeConfirmed, setReservationTypeConfirmed] = useState(false);
  const [dutyAccessConfirmed, setDutyAccessConfirmed] = useState(false);
  const [photoUploadConfirmed, setPhotoUploadConfirmed] = useState(false);

  const createReservation = useReservationAPI().createRes;
  const sendMail = useMailAPI().sendMail;

  const { getTime, getString } = dateUtils();

  const isPerformanceSpace = spaceId === 10;
  const isIndividualReservation = orgId === IndividualOrganizationId;
  const allConfirmationsChecked =
    reservationTypeConfirmed && dutyAccessConfirmed && photoUploadConfirmed;

  const { spaces: allSpaces } = useAllSpace();
  const selectedSpaceType = allSpaces?.find((s) => s.id === spaceId)?.spaceType;

  const { data: my } = useMyPenalty(!!userInfo && !isManager);
  const targetPenaltyDetail = orgId === IndividualOrganizationId
    ? my?.user
    : my?.organizations.find((o) => o.organization.id === orgId)?.detail;
  const restrictedSpaceState = selectedSpaceType !== undefined
    ? targetPenaltyDetail?.spaces.find((s) => s.spaceType === selectedSpaceType)
    : undefined;
  const isRestricted = !!restrictedSpaceState
    && restrictedSpaceState.restrictionStage !== PenaltyStageEnum.NONE
    && restrictedSpaceState.restrictionEnd > 0;

  function submit() {
    if (!allConfirmationsChecked) return;

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

    toaster.promise(
      createReservation(
        {
          content: {
            description: dscrp,
            innerParticipantNumber: inner,
            outerParticipantNumber: outer,
            food: food,
            busking: check && (spaceId === 13),
            workerNeed: (spaceId === 10 || spaceId === 11) ? worker : false,
            performance: isPerformanceSpace && performance === true,
          },
          userId: userInfo.id,
          organizationId: orgId,
          spaceId: spaceId,
          title: title,
          timeFrom: getTime(dateFrom) + getTime({ hour: hourFrom }),
          timeTo: getTime(dateTo) + getTime({ hour: hourTo }),
        },
        {
          onSuccess: () => {
            setCount(c => c + 1);
            if (worker && (spaceId === 10 || spaceId === 11)) {
              sendMail({
                to: "scspace.kaist@gmail.com",
                subject: `근로 요청 이유: ${userInfo.nameKr}`,
                template: "workerNeedReason",
                context: {
                  meta: {
                    description: workerNeedReason
                  }
                }
              });
            }
          },
        }
      ),
      {
        loading: {
          title: "Submitting...",
          description: "Please wait",
        },
        success: {
          title: "Submitted Successfully!",
          description: "Enjoy Your Reservation",
        },
        error: (err) => ({
          title: "Reservate Failed",
          description: err instanceof Error ? err.message : "Please resubmit"
        })
      }
    );
  }

  const [count, setCount] = useState<number>(0);

  return (
    <Scroll>
      <Stack>
        <Text color="fg.subtle">
          {'Before making a reservation, please register your organization under "My Page > Organization."'}
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
            {userInfo ? (
              <OrganizationForm
                id={userInfo.id}
                setOrgId={(value) => {
                  setOrgId(value);
                  setReservationTypeConfirmed(false);
                }}
              />
            ) : (
              <SmallLoading />
            )}
          </GridItem>
          {isPerformanceSpace && (
            <GridItem colSpan={6}>
              <PerformanceForm
                value={performance}
                setValue={setPerformance}
              />
            </GridItem>
          )}
          <GridItem colSpan={{ base: 6, md: 3 }}>
            <DateForm
              label="start date"
              date={dateFrom}
              setDate={setDateFrom}
            />
          </GridItem>
          <GridItem colSpan={{ base: 6, md: 3 }}>
            <DateForm
              label="end date"
              date={dateTo}
              setDate={setDateTo}
            />
          </GridItem>
          <GridItem colSpan={{ base: 6, md: 3 }}>
            <HourForm
              label="start time"
              setHour={setHourFrom}
            />
          </GridItem>
          <GridItem colSpan={{ base: 6, md: 3 }}>
            <HourForm
              label="end time"
              setHour={setHourTo}
            />
          </GridItem>
          <GridItem colSpan={6} >
            <CalendarView
              // dateFrom={new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate() - 1)}
              // dateTo={new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate() + 1)}
              dateFrom={dateFrom}
              dateTo={dateTo}
              spaceId={spaceId}
              refetchCounter={count}
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
          {(spaceId === 10 || spaceId === 11) && (
            <GridItem colSpan={{ base: 6, md: 2 }}>
              <WorkerForm
                value={worker}
                setValue={setWorker}
              />
            </GridItem>
          )}
          {worker && (spaceId === 10 || spaceId === 11) && (
            <GridItem colSpan={6}>
              <Stack>
                <Text>
                  Please describe the reason for needing workers. This information will help us understand your requirements better.
                </Text>
                <InputComponent
                  label="Reason for Needing Workers"
                  placeholder="Input Reason"
                  value={workerNeedReason}
                  onChange={setWorkerNeedReason}
                />
              </Stack>
            </GridItem>
          )}
        </Grid>
        <Separator />
        <Stack gap={3} py={2}>
          <Checkbox.Root
            checked={reservationTypeConfirmed}
            onCheckedChange={(e) => setReservationTypeConfirmed(!!e.checked)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              예약 주체가 {isIndividualReservation ? "개인 예약" : "조직 예약"}으로 올바르게 선택되었는지 확인했습니다.
            </Checkbox.Label>
          </Checkbox.Root>
          <Checkbox.Root
            checked={dutyAccessConfirmed}
            onCheckedChange={(e) => setDutyAccessConfirmed(!!e.checked)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              <Text as="span" display="block">
                상근시간 중에는 공간위원이 공간에 출입할 수 있음을 확인했습니다.
              </Text>
              <Text as="span" display="block" color="fg.muted" fontSize="sm">
                상근시간: 월~수요일 19:00~21:00, 목요일 21:00~23:00
              </Text>
            </Checkbox.Label>
          </Checkbox.Root>
          <Checkbox.Root
            checked={photoUploadConfirmed}
            onCheckedChange={(e) => setPhotoUploadConfirmed(!!e.checked)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              공간 이용 전·후 사진을 촬영하여 구글 폼에 업로드하겠습니다.
            </Checkbox.Label>
          </Checkbox.Root>
        </Stack>
        {isRestricted && restrictedSpaceState && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {`${PENALTY_SPACE_TYPE_LABEL[restrictedSpaceState.spaceType].kr}은(는) 페널티로 ${getString(restrictedSpaceState.restrictionEnd)}까지 예약 신청이 제한되어 있습니다.`}
              </Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}
        <Button
          rounded="sm"
          width="100%"
          disabled={!allConfirmationsChecked || isRestricted}
          onClick={submit}
        >
          Submit
        </Button>
      </Stack >
    </Scroll >
  );
};
