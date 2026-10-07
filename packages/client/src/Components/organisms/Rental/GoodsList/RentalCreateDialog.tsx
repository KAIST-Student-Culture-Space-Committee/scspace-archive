"use client"

import { 
    Dialog, 
    Portal, 
    Button, 
    VStack, 
    Box,
    Input, 
    PinInput, 
    useBreakpointValue,
    Field,
    Fieldset,
    Badge,
    Text,
    Stack,
    HStack,
    Center
} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import SelectComponent, { ISelectOption } from "@scspace-client/Components/molecules/forms/Select";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useStudent } from "@scspace-client/Hooks/user";
import { useOrganizationAPI } from "@scspace-client/Hooks/organization";
import { useRentalAPI } from "@scspace-client/Hooks/rental";
import { getErrorMessage } from "@scspace-client/Hooks/error";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import { IRentalCreateClient } from "@scspace-depot/types/rental/rental.type";
import { IGoods } from "@scspace-depot/types/rental";
import { useState, useEffect, useMemo } from "react";
import Counter from "./Counter";
import TextareaComponent from "@scspace-client/Components/molecules/forms/Textarea";
import { dateUtils } from "@scspace-client/Hooks/utils";

export default function RentalCreateDialog({ 
    item, 
    refetchAction,
    countAvailable,
}: { 
    item: IGoods; 
    refetchAction: () => void; 
    countAvailable: number;
}) {
    const dialogSize = useBreakpointValue<"full" | "md">({ base: "full", md: "md" });
    const [open, setOpen] = useState(false);

    const [studentNumberValue, setStudentNumberValue] = useState<string[]>(["", "", "", "", "", "", "", ""]);
    const [studentNumberStr, setStudentNumberStr] = useState<string>("");
    const [borrowerId, setBorrowerId] = useState<number | null>(null);

    const [organizationId, setOrganizationId] = useState<number>(1);
    const [orgOptions, setOrgOptions] = useState<ISelectOption[]>([]);

    const [phoneNumber, setPhoneNumber] = useState<string>("");
    const [emergencyContactPresident, setEmergencyContactPresident] = useState<string>("");
    const [emergencyContactVP, setEmergencyContactVP] = useState<string>("");

    const [reasonLocation, setReasonLocation] = useState<string>("");
    const [reasonPurpose, setReasonPurpose] = useState<string>("");

    const [deadline, setDeadline] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    const [count, setCount] = useState<number>(1);
    const maxCount = countAvailable;
    const { getTime, timeUnit } = useMemo(() => dateUtils(), []);

    const { isManager } = useAuth();
    const { student } = useStudent({ studentNumber: studentNumberStr });
    const { data: allOrganizations } = useOrganizationAPI().allOrganizations;
    const { createRental } = useRentalAPI();

    useEffect(() => {
        const allFilled = studentNumberValue.every(v => v !== "");
        if (allFilled) {
            setStudentNumberStr(studentNumberValue.join(""));
        }
    }, [studentNumberValue]);

    useEffect(() => {
        if (student) {
            setBorrowerId(student.id);
        } else {
            setBorrowerId(null);
        }
    }, [student]);

    useEffect(() => {
        if (organizationId === 1) {
            setEmergencyContactPresident(phoneNumber);
            setEmergencyContactVP(phoneNumber);
        }
    }, [organizationId, phoneNumber]);

    useEffect(() => {
        const options: ISelectOption[] = [
            { label: "개인 (Individual)", value: "1", description: "개인 대여" }
        ];
        
        if (allOrganizations && allOrganizations.length > 0) {
            allOrganizations.forEach((org) => {
                options.push({
                    label: org.name,
                    value: org.id.toString(),
                    description: "Delegator: " + org.delegator.nameKr
                });
            });
        }

        setOrgOptions(options);
    }, [allOrganizations]);

    const resetForm = () => {
        setStudentNumberValue(["", "", "", "", "", "", "", ""]);
        setStudentNumberStr("");
        setBorrowerId(null);
        setOrganizationId(1);
        setPhoneNumber("");
        setEmergencyContactPresident("");
        setEmergencyContactVP("");
        setReasonLocation("");
        setReasonPurpose("");
        setDeadline(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        setCount(1);
    };

    const handleSubmit = async () => {
        if (!isManager) {
            toaster.error({ title: "공간위원만 대여 등록이 가능합니다." });
            return;
        }
        if (!borrowerId) {
            toaster.error({ title: "대여자를 선택해주세요", description: "학번을 입력하여 대여자를 검색해주세요" });
            return;
        }
        if (!organizationId) {
            toaster.error({ title: "단체를 선택해주세요" });
            return;
        }
        if (!phoneNumber || phoneNumber.trim() === "") {
            toaster.error({ title: "전화번호를 입력해주세요" });
            return;
        }
        if (organizationId !== 1 && (!emergencyContactPresident || emergencyContactPresident.trim() === "")) {
            toaster.error({ title: "비상연락처(회장)를 입력해주세요" });
            return;
        }
        if (organizationId !== 1 && (!emergencyContactVP || emergencyContactVP.trim() === "")) {
            toaster.error({ title: "비상연락처(부회장)를 입력해주세요" });
            return;
        }
        if (!reasonLocation || reasonLocation.trim() === "") {
            toaster.error({ title: "사용 위치를 입력해주세요" });
            return;
        }
        if (!reasonPurpose || reasonPurpose.trim() === "") {
            toaster.error({ title: "사용 목적을 입력해주세요" });
            return;
        }
        if (!deadline) {
            toaster.error({ title: "반납 기한을 선택해주세요" });
            return;
        }
        if (count <= 0 || count > maxCount) {
            toaster.error({ title: "올바른 수량을 입력해주세요", description: `1부터 ${maxCount}까지 입력 가능합니다` });
            return;
        }

        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
        const timeDue = getTime(deadlineDate) + timeUnit.date - 1;

        const payload: IRentalCreateClient = {
            userId: borrowerId,
            organizationId,
            goodsId: item.id,
            count,
            phoneNumber,
            emergencyContactPresident,
            emergencyContactVicePresident: emergencyContactVP,
            reasonLocation,
            reasonPurpose,
            timeDue,
        };

        const toastId = `rental-create-${item.id}-${borrowerId}`;
        toaster.loading({
            id: toastId,
            title: "대여 신청 중...",
            description: "잠시만 기다려주세요",
        });

        try {
            await createRental(payload);
            resetForm();
            setOpen(false);
            refetchAction();
            toaster.update(toastId, {
                type: "success",
                title: "대여 신청 완료!",
                description: "대여가 성공적으로 신청되었습니다",
            });
        } catch (error) {
            toaster.update(toastId, {
                type: "error",
                title: "대여 신청 실패",
                description: getErrorMessage(error),
            });
        }
    };

    return (
        <Dialog.Root 
            open={open}
            onOpenChange={(e) => {
                setOpen(e.open);
                if (!e.open) resetForm();
            }}
            placement="center" 
            scrollBehavior="inside" 
            size={dialogSize}
        >
            <Dialog.Trigger asChild>
                <Button variant="outline" width="fit-content">
                    대여 신청
                </Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>대여 신청</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <VStack gap={4} alignItems="stretch">
                                <Fieldset.Root>
                                    <Field.Root required>
                                        <Field.Label>대여자 (학번으로 검색) <Field.RequiredIndicator /></Field.Label>
                                        <VStack width="100%" py={2} borderWidth="1px" rounded="sm" gap={4}>
                                            <PinInput.Root
                                                size="lg" 
                                                placeholder="-"
                                                value={studentNumberValue} 
                                                onValueChange={(e) => setStudentNumberValue(e.value)}
                                            >
                                                <PinInput.HiddenInput />
                                                <PinInput.Control width="100%" justifyContent="space-between">
                                                    {Array.from({ length: 8 }).map((_, i) => (
                                                        <PinInput.Input
                                                            textStyle="xl"
                                                            fontWeight="semibold"
                                                            key={i}
                                                            index={i}
                                                            padding={0}
                                                        />
                                                    ))}
                                                </PinInput.Control>
                                            </PinInput.Root>
                                            {student && (
                                                <HStack
                                                    borderWidth="1px"
                                                    rounded="sm"
                                                    padding={2}
                                                    width="fit-content"
                                                >
                                                    <Stack gap={1}>
                                                        <Text fontSize="lg" fontWeight="semibold">
                                                            {student.nameKr}
                                                        </Text>
                                                        <Text color="fg.muted" fontSize="xs">
                                                            {student.studentNumber}
                                                        </Text>
                                                    </Stack>
                                                </HStack>
                                            )}
                                        </VStack>
                                        <Field.HelperText>
                                            8자리 학번을 입력하여 대여자를 검색해주세요
                                        </Field.HelperText>
                                    </Field.Root>
                                </Fieldset.Root>

                                <SelectComponent
                                    inDialog={true}
                                    label="단체"
                                    required={true}
                                    optionList={orgOptions}
                                    defaultValue="1"
                                    onChange={(option) => setOrganizationId(parseInt(option.value))}
                                />

                                <Field.Root required>
                                    <Field.Label>전화번호 <Field.RequiredIndicator /></Field.Label>
                                    <Input
                                        type="tel"
                                        placeholder="010-1234-5678"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        rounded="sm"
                                        bg="white"
                                    />
                                </Field.Root>

                                <Field.Root required>
                                    <Field.Label>비상연락처 (회장) <Field.RequiredIndicator /></Field.Label>
                                    <Input
                                        type="tel"
                                        placeholder="010-1234-5678"
                                        value={emergencyContactPresident}
                                        onChange={(e) => setEmergencyContactPresident(e.target.value)}
                                        rounded="sm"
                                        bg="white"
                                        disabled={organizationId === 1}
                                    />
                                    {organizationId === 1 && (
                                        <Field.HelperText>개인 대여 시 전화번호와 동일하게 자동 입력됩니다.</Field.HelperText>
                                    )}
                                </Field.Root>

                                <Field.Root required>
                                    <Field.Label>비상연락처 (부회장) <Field.RequiredIndicator /></Field.Label>
                                    <Input
                                        type="tel"
                                        placeholder="010-1234-5678"
                                        value={emergencyContactVP}
                                        onChange={(e) => setEmergencyContactVP(e.target.value)}
                                        rounded="sm"
                                        bg="white"
                                        disabled={organizationId === 1}
                                    />
                                    {organizationId === 1 && (
                                        <Field.HelperText>개인 대여 시 전화번호와 동일하게 자동 입력됩니다.</Field.HelperText>
                                    )}
                                </Field.Root>

                                <Field.Root required>
                                    <Field.Label>사용 위치 <Field.RequiredIndicator /></Field.Label>
                                    <Input
                                        placeholder="예: 학생회관 1층"
                                        value={reasonLocation}
                                        onChange={(e) => setReasonLocation(e.target.value)}
                                        rounded="sm"
                                        bg="white"
                                    />
                                </Field.Root>

                                <TextareaComponent
                                    label="사용 목적"
                                    placeholder="물품을 사용하는 이유를 입력해주세요"
                                    value={reasonPurpose}
                                    required={true}
                                    onChange={setReasonPurpose}
                                />

                                <Field.Root required>
                                    <Field.Label>반납 기한 <Field.RequiredIndicator /></Field.Label>
                                    <Box
                                        borderWidth="1px"
                                        rounded="xl"
                                        bg="white"
                                        px={4}
                                        py={4}
                                    >
                                        <VStack gap={3}>
                                            <Badge colorPalette="blue" variant="subtle" px={3} py={1} rounded="full">
                                                {deadline.toLocaleDateString("ko-KR")}
                                            </Badge>
                                            <Center width="100%">
                                                <DatePicker
                                                    selected={deadline}
                                                    onChange={(date) => {
                                                        if (date) setDeadline(date);
                                                    }}
                                                    inline
                                                    minDate={new Date()}
                                                />
                                            </Center>
                                        </VStack>
                                    </Box>
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label>대여 물품</Field.Label>
                                    <Input
                                        value={item.name}
                                        readOnly
                                        disabled
                                        rounded="sm"
                                        bg="gray.100"
                                    />
                                </Field.Root>

                                <Field.Root required>
                                    <Field.Label>수량 <Field.RequiredIndicator /></Field.Label>
                                    <Center>
                                        <Box
                                            borderWidth="1px"
                                            rounded="xl"
                                            bg="white"
                                            px={4}
                                            py={3}
                                        >
                                            <Counter count={count} setCount={setCount} min={1} max={maxCount} />
                                        </Box>
                                    </Center>
                                    <Field.HelperText>
                                        최대 {maxCount}개까지 대여 가능합니다
                                    </Field.HelperText>
                                </Field.Root>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline" rounded="sm">
                                    취소
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button 
                                onClick={handleSubmit} 
                                rounded="sm"
                                colorPalette="blue"
                            >
                                신청
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
