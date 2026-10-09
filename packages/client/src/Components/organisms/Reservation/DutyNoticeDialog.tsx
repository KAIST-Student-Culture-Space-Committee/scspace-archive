import { Button, Dialog, Portal, Text } from "@chakra-ui/react";
import { DUTY_HOURS_KO } from "@scspace-depot/consts/duty.const";
import { Dispatch, SetStateAction } from "react";

export default function DutyNoticeDialog({ open, setOpen, onConfirm, showPerformanceHint }: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  onConfirm: () => void;
  showPerformanceHint?: boolean;
}) {
  return (
    <Dialog.Root
      role="alertdialog"
      placement="center"
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
    >
      <Portal>
        <Dialog.Backdrop zIndex={1500} />
        <Dialog.Positioner zIndex={1600}>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>상근시간 예약 안내</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>상근시간에 예약을 하면 공간위원이 출입할 수도 있습니다.</Text>
              <Text color="fg.muted" fontSize="sm" mt={2}>
                상근시간: {DUTY_HOURS_KO}
              </Text>
              {showPerformanceHint && (
                <Text color="fg.muted" fontSize="sm">
                  공연 목적의 예약이라면 공연 여부를 &quot;공연&quot;으로 선택해주세요.
                </Text>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button colorPalette="blue" rounded="sm" onClick={onConfirm}>
                  예약하기
                </Button>
              </Dialog.ActionTrigger>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" rounded="sm">
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
